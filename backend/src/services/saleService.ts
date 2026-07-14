import mongoose from 'mongoose';
import Sale from '../models/Sale';
import SaleItem from '../models/SaleItem';
import ProductUnit from '../models/ProductUnit';
import Customer from '../models/Customer';
import Payment from '../models/Payment';
import Product from '../models/Product';
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
      const { customerId, items, discount, grandTotal, amountPaid, paymentMode } = data;
      const invoiceNumber = `INV-${Date.now()}`;

      // Server-side Math Validation
      let expectedSubtotal = 0;
      let expectedTaxableAmount = 0;
      let expectedTaxAmount = 0;

      for (const item of items) {
        const product = await Product.findById(item.productId).lean();
        if (!product) throw new Error(`Product not found: ${item.productId}`);
        
        const trueGstRate = product.gstRate || 0;
        const lineTotal = item.unitPrice * item.quantity;
        
        expectedSubtotal += lineTotal;
        
        const lineTaxable = lineTotal / (1 + (trueGstRate / 100));
        const lineTax = lineTotal - lineTaxable;
        
        expectedTaxableAmount += lineTaxable;
        expectedTaxAmount += lineTax;
      }

      const expectedGrandTotal = expectedSubtotal - (discount || 0);

      if (Math.abs(expectedGrandTotal - grandTotal) > 1) {
        throw new Error('Financial calculation mismatch. Potential payload tampering.');
      }

      // 1. Create Sale
      const sale = new Sale({
        invoiceNumber,
        customerId,
        subtotal: expectedSubtotal,
        discount: discount || 0,
        taxableAmount: expectedTaxableAmount,
        taxRate: data.taxRate || 0,
        taxAmount: expectedTaxAmount,
        cgstAmount: data.cgstAmount,
        sgstAmount: data.sgstAmount,
        grandTotal: expectedGrandTotal,
        status: amountPaid >= expectedGrandTotal ? 'PAID' : 'PENDING',
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

        for (const serial of item.serialNumbers) {
          const updatedUnit = await ProductUnit.findOneAndUpdate(
            { serialNumber: serial, status: 'IN_STOCK' },
            { status: 'SOLD', saleId: sale._id, saleItemId: saleItem._id },
            { session, new: true }
          );

          if (!updatedUnit) {
            throw new Error(`Serial number ${serial} is already sold or unavailable.`);
          }
        }
      }

      // 3. Ledger Logic (Khata Sync)
      // Step A: Increase the customer's balance by the invoice grandTotal
      const updatedCustomer = await Customer.findByIdAndUpdate(
        customerId,
        { $inc: { outstandingBalance: expectedGrandTotal } },
        { session, new: true }
      );
      if (!updatedCustomer) {
        throw new Error(`Customer not found with ID: ${customerId}`);
      }

      // Step B: If money is paid, create Payment and reduce the balance
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

        await Customer.findByIdAndUpdate(
          customerId,
          { $inc: { outstandingBalance: -amountPaid } },
          { session }
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
      // The user requested referenceId === saleId, but we stored invoiceNumber previously. Let's check both or just invoiceNumber.
      // Based on our createSale logic, referenceId is the invoiceNumber.
      const payment = await Payment.findOne({ referenceId: sale.invoiceNumber, entityType: 'CUSTOMER' }).session(session);
      if (payment) {
        await Payment.deleteOne({ _id: payment._id }, { session });
        // Revert the payment deduction
        await Customer.findByIdAndUpdate(
          sale.customerId,
          { $inc: { outstandingBalance: payment.amount } },
          { session }
        );
      }

      // 4. Revert Customer balance (Revert the grandTotal addition)
      await Customer.findByIdAndUpdate(
        sale.customerId,
        { $inc: { outstandingBalance: -sale.grandTotal } },
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
