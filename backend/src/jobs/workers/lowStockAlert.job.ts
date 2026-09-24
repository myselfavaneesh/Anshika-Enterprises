import prisma from '../../prisma';
import { sendInvoiceEmail } from '../../services/emailService';
import { logger } from '../../utils/logger';

export async function processLowStockAlertJob(): Promise<void> {
  logger.info('[Worker:LowStockAlert] Checking products for low stock threshold...');

  try {
    const products = await prisma.product.findMany({
      include: {
        _count: {
          select: { productUnits: { where: { status: 'IN_STOCK' } } },
        },
      },
    });

    const lowStockProducts = products.filter(
      (p) => p._count.productUnits < p.lowStockThreshold
    );

    if (lowStockProducts.length === 0) {
      logger.info('[Worker:LowStockAlert] No products are below low stock threshold.');
      return;
    }

    logger.info(`[Worker:LowStockAlert] Found ${lowStockProducts.length} products with low stock. Preparing alert...`);

    let htmlContent = `<h2>Low Stock Alert</h2><p>The following products are running low on stock:</p><ul>`;
    lowStockProducts.forEach((p) => {
      htmlContent += `<li><strong>${p.name}</strong> (SKU: ${p.sku}) - Current Stock: ${p._count.productUnits}, Threshold: ${p.lowStockThreshold}</li>`;
    });
    htmlContent += `</ul>`;

    const adminEmail = process.env.ADMIN_EMAIL;

    if (adminEmail && process.env.SMTP_USER) {
      await sendInvoiceEmail(
        adminEmail,
        '🚨 Low Stock Alert - Anshika Enterprises',
        htmlContent
      );
      logger.info('[Worker:LowStockAlert] Low stock alert email sent successfully.');
    } else {
      logger.warn('[Worker:LowStockAlert] Email not sent: ADMIN_EMAIL or SMTP_USER is not configured in .env');
    }
  } catch (error: any) {
    logger.error('[Worker:LowStockAlert] Error processing low stock alert job:', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
