import { Response } from 'express';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth';
import { encryptData, decryptData, maskSensitive } from '../utils/crypto';
import { UpdateBusinessProfileSchema } from '../validators/businessProfile.validator';
import cacheService from '../services/cacheService';

const DEFAULT_TENANT_ID = 'default-tenant';

/**
 * Calculates business profile completion percentage (0 - 100%)
 */
export function calculateProfileCompletion(profile: any): number {
  if (!profile) return 0;
  const milestones = [
    Boolean(profile.businessName),
    Boolean(profile.legalName || profile.ownerName),
    Boolean(profile.phone),
    Boolean(profile.email),
    Boolean(profile.addressLine1 && profile.city && profile.state),
    Boolean(profile.pincode),
    Boolean(profile.gstin),
    Boolean(profile.pan),
    Boolean(profile.bankName && (profile.accountNumberLast4 || profile.encryptedAccountNumber)),
    Boolean(profile.ifscCode),
    Boolean(profile.upiId),
    Boolean(profile.logoUrl),
    Boolean(profile.signatureUrl),
  ];
  const completed = milestones.filter(Boolean).length;
  return Math.round((completed / milestones.length) * 100);
}

/**
 * GET /api/settings/business-profile
 * Accessible to all authenticated staff (Cashier read-only, Admin/Manager full)
 */
export const getBusinessProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT_ID;
    const canDecrypt = req.user?.role === 'admin' || req.user?.role === 'manager';
    const wantDecrypt = req.query.decrypt === 'true';

    const cacheKey = `profile:${canDecrypt && wantDecrypt ? 'full' : 'masked'}`;
    const cached = await cacheService.get(tenantId, cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    let profile = await prisma.businessProfile.findUnique({
      where: { tenantId }
    });

    if (!profile) {
      // Initialize default tenant profile
      profile = await prisma.businessProfile.create({
        data: {
          tenantId,
          businessName: 'Anshika Enterprises',
          legalName: 'Anshika Enterprises Private Limited',
          businessType: 'BOTH',
          businessCategory: 'Power & Solar Appliances',
          state: 'Uttar Pradesh',
          stateCode: '09',
          defaultGstRate: 18,
          invoicePrefix: 'INV',
          startingNumber: 1,
          defaultPrintSize: 'A4',
          showBankDetails: true,
          termsAndConditions: '1. Goods once sold will not be taken back without original invoice.\n2. Warranty as per manufacturer terms.\n3. Subject to local jurisdiction.',
        }
      });
    }

    let resolvedAccountNumber = '';
    if (profile.encryptedAccountNumber) {
      if (canDecrypt && wantDecrypt) {
        resolvedAccountNumber = decryptData(profile.encryptedAccountNumber);
      } else {
        resolvedAccountNumber = profile.accountNumberLast4 ? `••••••••${profile.accountNumberLast4}` : '';
      }
    }

    const completionPercentage = calculateProfileCompletion(profile);

    const responsePayload = {
      ...profile,
      defaultGstRate: Number(profile.defaultGstRate),
      accountNumber: resolvedAccountNumber,
      maskedAccountNumber: profile.accountNumberLast4 ? `••••••••${profile.accountNumberLast4}` : '',
      encryptedAccountNumber: undefined, // Never expose raw cipher in JSON response
      completionPercentage,
    };

    // Cache response for 10 minutes (600s)
    await cacheService.set(tenantId, cacheKey, responsePayload, 600);

    res.json(responsePayload);
  } catch (error: any) {
    logger.error('Error fetching business profile', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to retrieve business profile.' });
  }
};

/**
 * PUT /api/settings/business-profile
 * Restricted to Admin / Manager
 */
export const updateBusinessProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT_ID;

    // RBAC: Only Admin or Manager can update business profile
    if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
      res.status(403).json({ error: 'Access denied. Only Admins or Managers can configure the business profile.' });
      return;
    }

    const parsed = UpdateBusinessProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const data = parsed.data;
    const existing = await prisma.businessProfile.findUnique({ where: { tenantId } });

    // Check if GSTIN or Bank Account changed -> trigger needsReverification flag
    let needsReverification = existing?.needsReverification || false;
    if (existing && data.gstin && data.gstin !== existing.gstin) {
      needsReverification = true;
    }

    // Process Bank Account encryption
    let encryptedAccountNumber = existing?.encryptedAccountNumber;
    let accountNumberLast4 = existing?.accountNumberLast4;

    if (data.accountNumber && data.accountNumber.trim() !== '') {
      // If user provided a new unmasked account number
      if (!data.accountNumber.includes('•')) {
        encryptedAccountNumber = encryptData(data.accountNumber.trim());
        accountNumberLast4 = data.accountNumber.trim().slice(-4);
        if (existing?.accountNumberLast4 !== accountNumberLast4) {
          needsReverification = true;
        }
      }
    } else if (data.accountNumber === '') {
      encryptedAccountNumber = null;
      accountNumberLast4 = null;
    }

    const { accountNumber, ...updateFields } = data;

    const updated = await prisma.businessProfile.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...updateFields,
        encryptedAccountNumber,
        accountNumberLast4,
        needsReverification,
        updatedBy: req.user?._id || 'admin',
      },
      update: {
        ...updateFields,
        encryptedAccountNumber,
        accountNumberLast4,
        needsReverification,
        updatedBy: req.user?._id || 'admin',
      },
    });

    // Structured Audit Log with masked account number
    logger.info('Business profile updated successfully', {
      tenantId,
      updatedBy: req.user?._id,
      businessName: updated.businessName,
      gstin: updated.gstin,
      maskedAccount: maskSensitive(accountNumberLast4),
      needsReverification,
    });

    // Invalidate cached profile
    await cacheService.delPattern(tenantId, 'profile*');

    const completionPercentage = calculateProfileCompletion(updated);

    res.json({
      message: 'Business profile saved successfully.',
      profile: {
        ...updated,
        defaultGstRate: Number(updated.defaultGstRate),
        accountNumber: accountNumberLast4 ? `••••••••${accountNumberLast4}` : '',
        maskedAccountNumber: accountNumberLast4 ? `••••••••${accountNumberLast4}` : '',
        encryptedAccountNumber: undefined,
        completionPercentage,
      },
    });
  } catch (error: any) {
    logger.error('Error updating business profile', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to save business profile.' });
  }
};

/**
 * POST /api/settings/business-profile/upload
 * Uploads Base64 image assets (logo, signature, QR code)
 */
export const uploadProfileAsset = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
      res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
      return;
    }

    const { imageBase64, assetType } = req.body;
    if (!imageBase64 || !assetType) {
      res.status(400).json({ error: 'Image data and assetType are required.' });
      return;
    }

    if (!['logo', 'signature', 'qrCode'].includes(assetType)) {
      res.status(400).json({ error: 'Invalid assetType. Must be logo, signature, or qrCode.' });
      return;
    }

    // Size limit check (approx 2MB for base64)
    if (imageBase64.length > 3 * 1024 * 1024) {
      res.status(400).json({ error: 'Image size exceeds 2MB limit.' });
      return;
    }

    // Validate MIME prefix
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      res.status(400).json({ error: 'Invalid base64 image data URL format.' });
      return;
    }

    const mimeType = matches[1].toLowerCase();
    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedMimes.includes(mimeType)) {
      res.status(400).json({ error: 'Only secure PNG, JPEG, and WEBP raster image formats are permitted.' });
      return;
    }

    // Store data URL directly or cloud url
    res.json({
      url: imageBase64,
      assetType,
      message: 'Asset uploaded successfully.',
    });
  } catch (error: any) {
    logger.error('Error uploading profile asset', { error: error.message });
    res.status(500).json({ error: 'Failed to upload asset.' });
  }
};
