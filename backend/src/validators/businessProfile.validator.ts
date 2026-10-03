import { z } from 'zod';

// Indian GST State codes mapping
export const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/**
 * Validates Indian GSTIN 15-character format and internal check character (mod 36)
 */
export function validateGSTIN(gstin: string): { valid: boolean; reason?: string } {
  const clean = gstin.trim().toUpperCase();
  if (!clean) return { valid: true };
  if (clean.length !== 15) {
    return { valid: false, reason: 'GSTIN must be exactly 15 characters long.' };
  }
  if (!GSTIN_REGEX.test(clean)) {
    return { valid: false, reason: 'Invalid GSTIN structure (e.g. 09ABCDE1234F1Z5).' };
  }

  // Modulo 36 checksum calculation
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let factor = 1;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const codePoint = chars.indexOf(clean[i]);
    let addend = factor * codePoint;
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / 36) + (addend % 36);
    sum += addend;
  }
  const remainder = sum % 36;
  const checkCodePoint = (36 - remainder) % 36;
  const expectedCheckChar = chars[checkCodePoint];

  if (clean[14] !== expectedCheckChar) {
    // If exact check character fails, we still allow if strict is not enforced, but record warning
    return { valid: false, reason: `Invalid GSTIN check digit (expected '${expectedCheckChar}').` };
  }

  return { valid: true };
}

export const UpdateBusinessProfileSchema = z.object({
  businessName: z.string().trim().min(2, 'Business name must be at least 2 characters').max(150),
  legalName: z.string().trim().max(150).optional().nullable(),
  businessType: z.enum(['RETAIL', 'WHOLESALE', 'BOTH', 'SERVICE']).default('BOTH'),
  businessCategory: z.string().trim().max(100).optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  ownerName: z.string().trim().max(100).optional().nullable(),

  phone: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, 'Invalid phone number format').optional().nullable(),
  alternatePhone: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, 'Invalid alternate phone format').optional().nullable(),
  email: z.string().trim().email('Invalid email address').optional().nullable().or(z.literal('')),
  website: z.string().trim().url('Invalid website URL').optional().nullable().or(z.literal('')),

  addressLine1: z.string().trim().max(255).optional().nullable(),
  addressLine2: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  district: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).default('Uttar Pradesh'),
  stateCode: z.string().trim().length(2, 'State code must be 2 digits').default('09'),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, 'Pincode must be 6 digits').optional().nullable().or(z.literal('')),
  country: z.string().trim().max(100).default('India'),

  gstin: z.string().trim().toUpperCase().optional().nullable().or(z.literal('')),
  pan: z.string().trim().toUpperCase().regex(PAN_REGEX, 'Invalid PAN format (e.g. ABCDE1234F)').optional().nullable().or(z.literal('')),
  gstType: z.enum(['REGULAR', 'COMPOSITION', 'UNREGISTERED']).default('REGULAR'),
  defaultGstRate: z.number().min(0).max(100).default(18),
  defaultHsn: z.string().trim().max(12).optional().nullable().or(z.literal('')),

  accountHolderName: z.string().trim().max(150).optional().nullable(),
  bankName: z.string().trim().max(150).optional().nullable(),
  accountNumber: z.string().trim().regex(/^[0-9]{8,25}$/, 'Account number must be 8 to 25 digits').optional().nullable().or(z.literal('')),
  ifscCode: z.string().trim().toUpperCase().regex(IFSC_REGEX, 'Invalid IFSC code (e.g. SBIN0001234)').optional().nullable().or(z.literal('')),
  bankBranch: z.string().trim().max(150).optional().nullable(),
  upiId: z.string().trim().max(100).optional().nullable(),
  qrCodeUrl: z.string().optional().nullable(),

  invoicePrefix: z.string().trim().min(1).max(10).default('INV'),
  startingNumber: z.number().int().min(1).default(1),
  termsAndConditions: z.string().max(2000).optional().nullable(),
  signatureUrl: z.string().optional().nullable(),
  defaultPrintSize: z.enum(['A4', '80MM', '58MM']).default('A4'),
  showBankDetails: z.boolean().default(true),

  branches: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1),
      address: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      gstin: z.string().optional().nullable(),
    })
  ).default([]),
}).superRefine((data, ctx) => {
  // Validate GSTIN if provided
  if (data.gstin && data.gstin.trim() !== '') {
    const res = validateGSTIN(data.gstin);
    if (!res.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['gstin'],
        message: res.reason || 'Invalid GSTIN',
      });
    }

    // Verify first 2 digits match stateCode
    const gstPrefix = data.gstin.slice(0, 2);
    if (data.stateCode && gstPrefix !== data.stateCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['gstin'],
        message: `GSTIN state code (${gstPrefix}) does not match selected State Code (${data.stateCode}).`,
      });
    }
  }
});
