import mongoose from 'mongoose';
import Purchase from '../models/Purchase';
import PurchaseItem from '../models/PurchaseItem';
import ProductUnit from '../models/ProductUnit';
import Supplier from '../models/Supplier';
import Payment from '../models/Payment';
import { logger } from '../utils/logger';

export interface PurchaseItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxableUnitPrice: number;
  taxableTotalPrice: number;
  serialNumbers: string[];
}

export interface PurchaseInput {
  purchaseInvoiceNumber: string;
  supplierId: string;
  items: PurchaseItemInput[];
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

export class PurchaseService {
  static async createPurchase(data: PurchaseInput): Promise<any> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { 
        purchaseInvoiceNumber, supplierId, items, subtotal, discount, 
        taxableAmount, taxRate, taxAmount, cgstAmount, sgstAmount, 
        grandTotal, amountPaid, paymentMode 
      } = data;

      // 1. Create Purchase
      const purchase = new Purchase({
        purchaseInvoiceNumber,
        supplierId,
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
      await purchase.save({ session });

      // 2. Process items & Create ProductUnits
      for (const item of items) {
        if (!item.serialNumbers || item.serialNumbers.length !== item.quantity) {
          throw new Error(`Please provide exactly ${item.quantity} serial numbers for product ID: ${item.productId}`);
        }

        const purchaseItem = new PurchaseItem({
          purchaseId: purchase._id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          taxableUnitPrice: item.taxableUnitPrice,
          taxableTotalPrice: item.taxableTotalPrice,
        });
        await purchaseItem.save({ session });

        // Add ProductUnits to Inventory
        const unitsToInsert = item.serialNumbers.map(sn => ({
          productId: item.productId,
          serialNumber: sn,
          status: 'IN_STOCK',
          purchaseId: purchase._id,
          purchaseItemId: purchaseItem._id,
        }));
        
        await ProductUnit.insertMany(unitsToInsert, { session });
      }

      // 3. Ledger Logic (Khata Sync)
      if (amountPaid > 0) {
        const payment = new Payment({
          entityType: 'SUPPLIER',
          entityId: supplierId,
          type: 'MONEY_OUT',
          amount: amountPaid,
          paymentMode: paymentMode || 'CASH',
          referenceId: purchaseInvoiceNumber,
          notes: `Payment for Purchase Invoice ${purchaseInvoiceNumber}`,
        });
        await payment.save({ session });
      }

      const amountDue = grandTotal - amountPaid;
      if (amountDue > 0) {
         // Increment Supplier's outstanding balance (We owe them)
         const updatedSupplier = await Supplier.findByIdAndUpdate(
           supplierId,
           { $inc: { outstandingBalance: amountDue } },
           { session, new: true }
         );
         if (!updatedSupplier) {
           throw new Error(`Supplier not found with ID: ${supplierId}`);
         }
      } else if (amountDue < 0) {
         // We overpaid, reduce what we owe them
         const updatedSupplier = await Supplier.findByIdAndUpdate(
           supplierId,
           { $inc: { outstandingBalance: amountDue } },
           { session, new: true }
         );
      }

      await session.commitTransaction();
      session.endSession();

      logger.info('Purchase completed successfully', { purchaseId: purchase._id, purchaseInvoiceNumber });
      return purchase;
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      logger.error('Error during createPurchase', { error: error.message });
      
      if (error.message.includes('Transaction numbers are only allowed on a replica set member or mongos')) {
        throw new Error('MongoDB Replica Set required for Ledger Transactions. Please configure MongoDB.');
      }
      throw error;
    }
  }

  static async deletePurchase(purchaseId: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const purchase = await Purchase.findById(purchaseId).session(session);
      if (!purchase) throw new Error('Purchase not found');

      // 1. Delete ProductUnits
      await ProductUnit.deleteMany({ purchaseId: purchase._id }, { session });

      // 2. Delete PurchaseItems
      await PurchaseItem.deleteMany({ purchaseId: purchase._id }, { session });

      // 3. Find and delete associated Payment
      const payment = await Payment.findOne({ referenceId: purchase.purchaseInvoiceNumber, entityType: 'SUPPLIER' }).session(session);
      let amountPaid = 0;
      if (payment) {
        amountPaid = payment.amount;
        await Payment.deleteOne({ _id: payment._id }, { session });
      }

      // 4. Revert Supplier balance
      const amountDue = purchase.grandTotal - amountPaid;
      await Supplier.findByIdAndUpdate(
        purchase.supplierId,
        { $inc: { outstandingBalance: -amountDue } },
        { session }
      );

      // 5. Delete Purchase
      await Purchase.deleteOne({ _id: purchase._id }, { session });

      await session.commitTransaction();
      session.endSession();
      logger.info('Purchase deleted successfully', { purchaseId });
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      logger.error('Error deleting purchase', { error: error.message });
      throw error;
    }
  }
}
