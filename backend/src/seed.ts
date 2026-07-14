import bcrypt from 'bcrypt';
import prisma from './prisma';
import dotenv from 'dotenv';

dotenv.config();

const seed = async () => {
  try {
    console.log('Connected to Database via Prisma');

    const adminExists = await prisma.user.findFirst({
      where: { role: 'admin' }
    });
    if (adminExists) {
      console.log('Admin already exists');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
      }
    });

    console.log('Admin user created successfully:');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

seed();
