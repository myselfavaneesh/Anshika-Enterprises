import mongoose from 'mongoose';
import Sale from '../models/Sale';
import SaleItem from '../models/SaleItem';
import ProductUnit from '../models/ProductUnit';
import { logger } from '../utils/logger';

export interface SaleItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxableUnitPrice: number;
  taxableTotalPrice: number;
  serialNumbers: string[];
}

export interface SaleInput {
  customerId: string;
  items: SaleItemInput[];
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  grandTotal: number;
}

export class SaleService {
  static async createSale(data: SaleInput): Promise<any> {
    try {
      const { customerId, items, subtotal, discount, taxableAmount, taxRate, taxAmount, cgstAmount, sgstAmount, grandTotal } = data;
      const invoiceNumber = `INV-${Date.now()}`;

      // 1. Create Sale
      const sale = new Sale({
        invoiceNumber,
        customerId,
        subtotal,
        discount,
        taxableAmount,
        taxRate,
        taxAmount,
        cgstAmount,
        sgstAmount,
        grandTotal,
      });
      await sale.save();

      // 2. Process items
      for (const item of items) {
        if (!item.serialNumbers || item.serialNumbers.length !== item.quantity) {
          throw new Error(`Please provide exactly ${item.quantity} serial numbers for product ID: ${item.productId}`);
        }

        // Create SaleItem (Note: serialNumbers are NOT saved on the SaleItem document itself anymore)
        const saleItem = new SaleItem({
          saleId: sale._id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          taxableUnitPrice: item.taxableUnitPrice,
          taxableTotalPrice: item.taxableTotalPrice,
        });
        await saleItem.save();

        // Update ProductUnits to SOLD and link saleId and saleItemId
        const result = await ProductUnit.updateMany(
          { productId: item.productId, serialNumber: { $in: item.serialNumbers }, status: 'IN_STOCK' },
          { $set: { status: 'SOLD', saleId: sale._id, saleItemId: saleItem._id } }
        );

        if (result.modifiedCount !== item.serialNumbers.length) {
          throw new Error(`One or more serial numbers are not available or are already sold/defective for product ID: ${item.productId}`);
        }
      }

      logger.info('Sale completed successfully', { saleId: sale._id, invoiceNumber });
      return sale;
    } catch (error: any) {
      logger.error('Error during createSale', { error: error.message });
      throw error;
    }
  }
}
