import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import prisma from '../prisma';

export interface AuthRequest extends Request {
  user?: any;
  token?: string;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    res.status(401).json({ error: 'Access denied. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if session exists and is active
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || !session.isActive) {
      res.status(401).json({ error: 'Session expired or invalid. Please login again.' });
      return;
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch (ex) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    return;
  }
  next();
};

/**
 * Check if the authenticated user's account is active.
 * Blocks disabled/inactive staff from accessing any API resource.
 */
export const checkActive = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user && req.user.isActive === false) {
    res.status(403).json({ error: 'Your account has been deactivated. Contact admin.' });
    return;
  }
  next();
};

/**
 * Permission-based middleware for granular RBAC.
 * Admin role always bypasses permission checks.
 * For other roles, checks if user has at least one of the required permissions.
 * 
 * Usage: requirePermission('sales:view')
 *        requirePermission('sales:edit', 'sales:delete')  // OR logic
 */
export const requirePermission = (...permissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    // Admin always passes all permission checks
    if (req.user.role === 'admin') {
      next();
      return;
    }

    const userPermissions: string[] = req.user.permissions || [];
    const hasPermission = permissions.some((p) => userPermissions.includes(p));

    if (!hasPermission) {
      res.status(403).json({
        error: 'Permission denied.',
        required: permissions,
      });
      return;
    }
    next();
  };
};
