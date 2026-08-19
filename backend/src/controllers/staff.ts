import { Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth';

// All available permissions in the system
export const ALL_PERMISSIONS = [
  'dashboard:view',
  'products:view', 'products:create', 'products:edit', 'products:delete',
  'categories:view', 'categories:create', 'categories:edit', 'categories:delete',
  'inventory:view', 'inventory:edit',
  'sales:view', 'sales:create', 'sales:edit', 'sales:delete',
  'purchases:view', 'purchases:create', 'purchases:edit', 'purchases:delete',
  'quotations:view', 'quotations:create', 'quotations:edit', 'quotations:delete',
  'parties:view', 'parties:create', 'parties:edit', 'parties:delete',
  'payments:view', 'payments:create',
  'staff:view', 'staff:create', 'staff:edit', 'staff:delete',
];

// Role presets — default permissions for each role
export const ROLE_PRESETS: Record<string, string[]> = {
  admin: [...ALL_PERMISSIONS], // admin actually bypasses checks, but stored for clarity
  manager: [
    'dashboard:view',
    'products:view', 'products:create', 'products:edit',
    'categories:view', 'categories:create', 'categories:edit',
    'inventory:view', 'inventory:edit',
    'sales:view', 'sales:create', 'sales:edit',
    'purchases:view', 'purchases:create', 'purchases:edit',
    'quotations:view', 'quotations:create', 'quotations:edit',
    'parties:view', 'parties:create', 'parties:edit',
    'payments:view', 'payments:create',
  ],
  staff: [
    'dashboard:view',
    'products:view',
    'categories:view',
    'inventory:view',
    'sales:view', 'sales:create',
    'purchases:view',
    'quotations:view',
    'parties:view',
    'payments:view',
  ],
};

// ---- Validation Schemas ----

const CreateStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  role: z.enum(['admin', 'manager', 'staff']),
  permissions: z.array(z.string()).default([]),
  phone: z.string().max(15).optional().nullable(),
});

const UpdateStaffSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().max(255).optional(),
  password: z.string().min(6).max(128).optional(), // optional — only if changing
  role: z.enum(['admin', 'manager', 'staff']).optional(),
  permissions: z.array(z.string()).optional(),
  phone: z.string().max(15).optional().nullable(),
  isActive: z.boolean().optional(),
});

// ---- Controllers ----

/**
 * GET /api/staff — List all staff members
 */
export const getStaffList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        phone: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(staff);
  } catch (error: any) {
    logger.error('Error fetching staff list', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch staff list' });
  }
};

/**
 * GET /api/staff/:id — Get single staff member
 */
export const getStaffById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staffId = req.params.id as string;
    const staff = await prisma.user.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        phone: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!staff) {
      res.status(404).json({ error: 'Staff member not found' });
      return;
    }

    res.json(staff);
  } catch (error: any) {
    logger.error('Error fetching staff', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch staff member' });
  }
};

/**
 * POST /api/staff — Create new staff member
 */
export const createStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = CreateStaffSchema.parse(req.body);

    // Validate permissions — only allow known permissions
    const invalidPerms = data.permissions.filter((p) => !ALL_PERMISSIONS.includes(p));
    if (invalidPerms.length > 0) {
      res.status(400).json({ error: `Invalid permissions: ${invalidPerms.join(', ')}` });
      return;
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      res.status(400).json({ error: 'A user with this email already exists' });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const staff = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        permissions: data.permissions,
        phone: data.phone || null,
        isActive: true,
        createdBy: req.user?._id || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        phone: true,
        createdBy: true,
        createdAt: true,
      },
    });

    logger.info(`Staff created: ${data.email} (role: ${data.role}) by ${req.user?._id}`);
    res.status(201).json(staff);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    logger.error('Error creating staff', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to create staff member' });
  }
};

/**
 * PUT /api/staff/:id — Update staff member
 */
export const updateStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = UpdateStaffSchema.parse(req.body);
    const staffId = req.params.id as string;

    // Cannot edit your own role/permissions (safety)
    if (staffId === req.user?._id && (data.role || data.permissions)) {
      res.status(400).json({ error: 'You cannot change your own role or permissions' });
      return;
    }

    // Check if staff exists
    const existing = await prisma.user.findUnique({ where: { id: staffId } });
    if (!existing) {
      res.status(404).json({ error: 'Staff member not found' });
      return;
    }

    // If changing email, check uniqueness
    if (data.email && data.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
      if (emailTaken) {
        res.status(400).json({ error: 'A user with this email already exists' });
        return;
      }
    }

    // Validate permissions if provided
    if (data.permissions) {
      const invalidPerms = data.permissions.filter((p) => !ALL_PERMISSIONS.includes(p));
      if (invalidPerms.length > 0) {
        res.status(400).json({ error: `Invalid permissions: ${invalidPerms.join(', ')}` });
        return;
      }
    }

    // Build update payload
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.permissions !== undefined) updateData.permissions = data.permissions;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Hash new password if provided
    if (data.password) {
      const salt = await bcrypt.genSalt(12);
      updateData.password = await bcrypt.hash(data.password, salt);
    }

    const updated = await prisma.user.update({
      where: { id: staffId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        phone: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info(`Staff updated: ${updated.email} by ${req.user?._id}`);
    res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    logger.error('Error updating staff', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update staff member' });
  }
};

/**
 * DELETE /api/staff/:id — Delete staff member
 */
export const deleteStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staffId = req.params.id as string;

    // Cannot delete yourself
    if (staffId === req.user?._id) {
      res.status(400).json({ error: 'You cannot delete your own account' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id: staffId } });
    if (!existing) {
      res.status(404).json({ error: 'Staff member not found' });
      return;
    }

    await prisma.user.delete({ where: { id: staffId } });

    logger.info(`Staff deleted: ${existing.email} by ${req.user?._id}`);
    res.json({ message: 'Staff member deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting staff', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to delete staff member' });
  }
};

/**
 * PATCH /api/staff/:id/toggle-active — Toggle staff active status
 */
export const toggleStaffActive = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staffId = req.params.id as string;

    // Cannot deactivate yourself
    if (staffId === req.user?._id) {
      res.status(400).json({ error: 'You cannot deactivate your own account' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id: staffId } });
    if (!existing) {
      res.status(404).json({ error: 'Staff member not found' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: staffId },
      data: { isActive: !existing.isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    logger.info(`Staff ${updated.isActive ? 'activated' : 'deactivated'}: ${updated.email} by ${req.user?._id}`);
    res.json(updated);
  } catch (error: any) {
    logger.error('Error toggling staff status', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to toggle staff status' });
  }
};

/**
 * GET /api/staff/permissions — Get all available permissions and role presets
 */
export const getPermissionsList = async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json({
    allPermissions: ALL_PERMISSIONS,
    rolePresets: ROLE_PRESETS,
  });
};
