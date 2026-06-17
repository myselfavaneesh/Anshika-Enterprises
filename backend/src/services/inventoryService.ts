import mongoose from 'mongoose';
import Product from '../models/Product';
import ProductUnit from '../models/ProductUnit';
import { logger } from '../utils/logger';

export interface StockInData {
  productId: string;
  purchaseInvoiceNumber?: string;
  supplierName?: string;
  serialNumbers: string[];
  purchasePrice?: number;
}

export class InventoryService {
  static async stockIn(data: StockInData): Promise<void> {
    try {
      const { productId, purchaseInvoiceNumber, supplierName, serialNumbers, purchasePrice } = data;

      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const units = serialNumbers.map((serialNumber: string) => ({
        productId,
        serialNumber,
        status: 'IN_STOCK',
        purchaseInvoiceNumber,
        supplierName,
        purchasePrice: purchasePrice || 0,
      }));

      await ProductUnit.insertMany(units);

      logger.info('Stock added successfully', { productId, unitCount: units.length });
    } catch (error: any) {
      logger.error('Error during stockIn', { error: error.message, data });
      throw error;
    }
  }

  static async stockOut(productId: string, serialNumbers: string[]): Promise<void> {
    try {
      const result = await ProductUnit.updateMany(
        { productId, serialNumber: { $in: serialNumbers }, status: 'IN_STOCK' },
        { $set: { status: 'DEFECTIVE' } }
      );

      if (result.modifiedCount !== serialNumbers.length) {
        throw new Error('Some serial numbers were not found or are not in stock');
      }

      logger.info('Stock removed successfully', { productId, count: serialNumbers.length });
    } catch (error: any) {
      logger.error('Error during stockOut', { error: error.message, productId });
      throw error;
    }
  }
}
