import prisma from '../prisma';
import { logger } from '../utils/logger';

export interface StockInData {
  productId: string;
  purchaseInvoiceNumber?: string;
  supplierName?: string;
  serialNumbers?: string[];
  quantity?: number;
  purchasePrice?: number;
}

export class InventoryService {
  static async stockIn(data: StockInData): Promise<void> {
    try {
      const { productId, purchaseInvoiceNumber, supplierName, serialNumbers, quantity, purchasePrice } = data;

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new Error('Product not found');
      }

      if (product.trackSerials) {
        if (!serialNumbers || serialNumbers.length === 0) {
          throw new Error('Serial numbers are required for this product');
        }
        const units = serialNumbers.map((serialNumber: string) => ({
          productId,
          serialNumber,
          status: 'IN_STOCK',
          purchaseInvoiceNumber,
          supplierName,
          purchasePrice: purchasePrice || 0,
        }));
        await prisma.productUnit.createMany({ data: units });
        logger.info('Stock added successfully (serialized)', { productId, unitCount: units.length });
      } else {
        if (!quantity || quantity <= 0) {
          throw new Error('Valid quantity is required for non-serialized products');
        }
        await prisma.inventory.upsert({
          where: { productId },
          create: { productId, quantity: quantity },
          update: { quantity: { increment: quantity } }
        });
        logger.info('Stock added successfully (non-serialized)', { productId, quantity });
      }

    } catch (error: any) {
      logger.error('Error during stockIn', { error: error.message, data });
      throw error;
    }
  }

  static async stockOut(productId: string, data: { serialNumbers?: string[], quantity?: number }): Promise<void> {
    try {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Product not found');

      if (product.trackSerials) {
        if (!data.serialNumbers || data.serialNumbers.length === 0) {
          throw new Error('Serial numbers are required for this product');
        }
        const result = await prisma.productUnit.updateMany({
          where: { productId, serialNumber: { in: data.serialNumbers }, status: 'IN_STOCK' },
          data: { status: 'DEFECTIVE' }
        });

        if (result.count !== data.serialNumbers.length) {
          throw new Error('Some serial numbers were not found or are not in stock');
        }
        logger.info('Stock removed successfully (serialized)', { productId, count: data.serialNumbers.length });
      } else {
        if (!data.quantity || data.quantity <= 0) {
          throw new Error('Valid quantity is required for non-serialized products');
        }
        const inventory = await prisma.inventory.findUnique({ where: { productId } });
        if (!inventory || inventory.quantity < data.quantity) {
          throw new Error('Insufficient stock');
        }
        await prisma.inventory.update({
          where: { productId },
          data: { quantity: { decrement: data.quantity } }
        });
        logger.info('Stock removed successfully (non-serialized)', { productId, quantity: data.quantity });
      }
    } catch (error: any) {
      logger.error('Error during stockOut', { error: error.message, productId });
      throw error;
    }
  }
}
