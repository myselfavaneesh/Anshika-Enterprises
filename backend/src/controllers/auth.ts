import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { JWT_SECRET } from '../config';
import { AuthRequest } from '../middleware/auth';

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(128),
});

export const login = async (req: Request, res: Response): Promise<void> => {
  const ipAddress = req.ip || req.connection?.remoteAddress || 'Unknown IP';
  const userAgent = req.headers['user-agent'] || 'Unknown Device';
  let emailAttempt = '';

  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid email or password format.' });
      return;
    }
    
    const { email, password } = parsed.data;
    emailAttempt = email;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await prisma.loginHistory.create({
        data: {
          email,
          ipAddress,
          userAgent,
          status: 'FAILED',
          reason: 'Invalid email',
        }
      });
      res.status(400).json({ error: 'Invalid email or password.' });
      return;
    }

    if (!user.isActive) {
      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          email,
          ipAddress,
          userAgent,
          status: 'FAILED',
          reason: 'Account deactivated',
        }
      });
      res.status(403).json({ error: 'Your account has been deactivated. Contact admin.' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          email,
          ipAddress,
          userAgent,
          status: 'FAILED',
          reason: 'Invalid password',
        }
      });
      res.status(400).json({ error: 'Invalid email or password.' });
      return;
    }

    const permissions = Array.isArray(user.permissions) ? user.permissions : [];

    const token = jwt.sign(
      {
        _id: user.id,
        role: user.role,
        permissions: permissions,
        isActive: user.isActive,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await prisma.session.create({
      data: {
        userId: user.id,
        token: token,
        ipAddress,
        userAgent,
        expiresAt,
      }
    });

    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        email,
        ipAddress,
        userAgent,
        status: 'SUCCESS',
      }
    });

    logger.info(`User logged in: ${email} (role: ${user.role})`);
    res.json({
      token,
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: permissions,
        phone: user.phone,
      },
    });
  } catch (error: any) {
    logger.error('Server error during login', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error during login' });
  }
};

export const getSessions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user._id;
    const sessions = await prisma.session.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    
    const safeSessions = sessions.map(s => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastActive: s.createdAt, // Just using createdAt for now
      expiresAt: s.expiresAt,
      isCurrent: s.token === req.token,
    }));
    res.json(safeSessions);
  } catch (error: any) {
    res.status(500).json({ error: 'Error fetching sessions' });
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const token = req.token;
    if (token) {
      await prisma.session.updateMany({
        where: { token },
        data: { isActive: false }
      });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error logging out' });
  }
};

export const logoutAllOther = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user._id;
    const currentToken = req.token;
    
    if (!currentToken) {
      res.status(401).json({ error: 'No token found' });
      return;
    }
    
    await prisma.session.updateMany({
      where: { 
        userId, 
        token: { not: currentToken },
        isActive: true
      },
      data: { isActive: false }
    });
    res.json({ message: 'Logged out from all other devices' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error logging out from other devices' });
  }
};

export const getLoginHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user._id;
    const history = await prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: 'Error fetching login history' });
  }
};

// Seed admin script (for MVP purposes)
export const seedAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminExists = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (adminExists) {
      res.status(400).json({ error: 'Admin already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const admin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        permissions: [],
        isActive: true,
      }
    });

    logger.info('Admin user seeded via endpoint');
    res.status(201).json({ message: 'Admin user created (admin@example.com / admin123)' });
  } catch (error: any) {
    logger.error('Error creating admin', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Error creating admin' });
  }
};
