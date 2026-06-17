import mongoose from 'mongoose';
import Sale from '../models/Sale';
import SaleItem from '../models/SaleItem';
import ProductUnit from '../models/ProductUnit';
import Customer from '../models/Customer';
import Payment from '../models/Payment';
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
  amountPaid: number;
  paymentMode?: string;
}

export class SaleService {
  static async createSale(data: SaleInput): Promise<any> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { customerId, items, subtotal, discount, taxableAmount, taxRate, taxAmount, cgstAmount, sgstAmount, grandTotal, amountPaid, paymentMode } = data;
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
        status: amountPaid >= grandTotal ? 'PAID' : 'PENDING',
      });
      await sale.save({ session });

      // 2. Process items & Update ProductUnits
      for (const item of items) {
        if (!item.serialNumbers || item.serialNumbers.length !== item.quantity) {
          throw new Error(`Please provide exactly ${item.quantity} serial numbers for product ID: ${item.productId}`);
        }

        const saleItem = new SaleItem({
          saleId: sale._id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          taxableUnitPrice: item.taxableUnitPrice,
          taxableTotalPrice: item.taxableTotalPrice,
        });
        await saleItem.save({ session });

        const result = await ProductUnit.updateMany(
          { productId: item.productId, serialNumber: { $in: item.serialNumbers }, status: 'IN_STOCK' },
          { $set: { status: 'SOLD', saleId: sale._id, saleItemId: saleItem._id } },
          { session }
        );

        if (result.modifiedCount !== item.serialNumbers.length) {
          throw new Error(`One or more serial numbers are not available or are already sold/defective for product ID: ${item.productId}`);
        }
      }

      // 3. Ledger Logic (Khata Sync)
      if (amountPaid > 0) {
        const payment = new Payment({
          entityType: 'CUSTOMER',
          entityId: customerId,
          type: 'MONEY_IN',
          amount: amountPaid,
          paymentMode: paymentMode || 'CASH',
          referenceId: invoiceNumber,
          notes: `Payment for Sale ${invoiceNumber}`,
        });
        await payment.save({ session });
      }

      const amountDue = grandTotal - amountPaid;
      if (amountDue > 0) {
         // Increment Customer's outstanding balance
         const updatedCustomer = await Customer.findByIdAndUpdate(
           customerId,
           { $inc: { outstandingBalance: amountDue } },
           { session, new: true }
         );
         if (!updatedCustomer) {
           throw new Error(`Customer not found with ID: ${customerId}`);
         }
      } else if (amountDue < 0) {
         // They overpaid, reduce their balance (or they have credit)
         const updatedCustomer = await Customer.findByIdAndUpdate(
           customerId,
           { $inc: { outstandingBalance: amountDue } },
           { session, new: true }
         );
      }

      await session.commitTransaction();
      session.endSession();

      logger.info('Sale completed successfully', { saleId: sale._id, invoiceNumber });
      return sale;
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      logger.error('Error during createSale', { error: error.message });
      
      if (error.message.includes('Transaction numbers are only allowed on a replica set member or mongos')) {
        throw new Error('MongoDB Replica Set required for Ledger Transactions. Please configure MongoDB.');
      }
      throw error;
    }
  }

  static async deleteSale(saleId: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const sale = await Sale.findById(saleId).session(session);
      if (!sale) throw new Error('Sale not found');

      // 1. Revert ProductUnit statuses
      await ProductUnit.updateMany(
        { saleId: sale._id },
        { $set: { status: 'IN_STOCK' }, $unset: { saleId: "", saleItemId: "" } },
        { session }
      );

      // 2. Delete SaleItems
      await SaleItem.deleteMany({ saleId: sale._id }, { session });

      // 3. Find and delete associated Payment
      const payment = await Payment.findOne({ referenceId: sale.invoiceNumber, entityType: 'CUSTOMER' }).session(session);
      let amountPaid = 0;
      if (payment) {
        amountPaid = payment.amount;
        await Payment.deleteOne({ _id: payment._id }, { session });
      }

      // 4. Revert Customer balance
      // Original logic: amountDue = grandTotal - amountPaid. This was added to outstandingBalance.
      // Now we subtract amountDue.
      const amountDue = sale.grandTotal - amountPaid;
      await Customer.findByIdAndUpdate(
        sale.customerId,
        { $inc: { outstandingBalance: -amountDue } },
        { session }
      );

      // 5. Delete Sale
      await Sale.deleteOne({ _id: sale._id }, { session });

      await session.commitTransaction();
      session.endSession();
      logger.info('Sale deleted successfully', { saleId });
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      logger.error('Error deleting sale', { error: error.message });
      throw error;
    }
  }
}
