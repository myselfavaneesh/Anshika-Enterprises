import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import { logger } from './logger';

const prisma = new PrismaClient();

// Setup Nodemailer transporter
// The user will need to configure these in their .env file
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const initInventoryCron = () => {
  // Run everyday at 09:00 AM
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running low stock alert cron job...');
    try {
      const products = await prisma.product.findMany({
        include: {
          _count: {
            select: { productUnits: { where: { status: 'IN_STOCK' } } }
          }
        }
      });

      const lowStockProducts = products.filter(
        p => p._count.productUnits < p.lowStockThreshold
      );

      if (lowStockProducts.length > 0) {
        logger.info(`Found ${lowStockProducts.length} products with low stock. Sending email...`);
        
        let htmlContent = `<h2>Low Stock Alert</h2><p>The following products are running low on stock:</p><ul>`;
        lowStockProducts.forEach(p => {
          htmlContent += `<li><strong>${p.name}</strong> (SKU: ${p.sku}) - Current Stock: ${p._count.productUnits}, Threshold: ${p.lowStockThreshold}</li>`;
        });
        htmlContent += `</ul>`;

        const adminEmail = process.env.ADMIN_EMAIL;
        
        if (adminEmail && process.env.SMTP_USER) {
          await transporter.sendMail({
            from: `"Anshika Enterprises" <${process.env.SMTP_USER}>`,
            to: adminEmail,
            subject: '🚨 Low Stock Alert - Anshika Enterprises',
            html: htmlContent,
          });
          logger.info('Low stock alert email sent successfully.');
        } else {
          logger.warn('Low stock alert email not sent because ADMIN_EMAIL or SMTP_USER is not configured in .env');
        }
      } else {
        logger.info('No products are below the low stock threshold.');
      }
    } catch (error) {
      logger.error('Error running inventory cron job:', error);
    }
  });
  
  logger.info('Inventory cron job initialized');
};
