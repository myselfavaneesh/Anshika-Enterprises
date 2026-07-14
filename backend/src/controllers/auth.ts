import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { mapToMongoose } from '../utils/mapper';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(400).json({ error: 'Invalid email or password.' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(400).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      { _id: user.id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    logger.info(`User logged in: ${email}`);
    res.json({ token, user: { _id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error: any) {
    logger.error('Server error during login', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error during login' });
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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const admin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
      }
    });

    logger.info('Admin user seeded via endpoint');
    res.status(201).json({ message: 'Admin user created (admin@example.com / admin123)' });
  } catch (error: any) {
    logger.error('Error creating admin', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Error creating admin' });
  }
};
