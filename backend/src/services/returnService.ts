import mongoose from 'mongoose';
import SaleReturn from '../models/SaleReturn';
import ProductUnit from '../models/ProductUnit';
import Customer from '../models/Customer';
import Sale from '../models/Sale';
import { logger } from '../utils/logger';

export class ReturnService {
  static async processReturn(saleId: string, serialNumber: string, refundAmount: number, notes?: string): Promise<any> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Step A: Verify the ProductUnit exists with the given serialNumber and saleId
      const unit = await ProductUnit.findOne({ serialNumber, saleId, status: 'SOLD' }).session(session);
      if (!unit) {
        throw new Error(`Serial number ${serialNumber} is not associated with this sale or is already marked defective.`);
      }

      const sale = await Sale.findById(saleId).session(session);
      if (!sale) {
        throw new Error(`Sale not found: ${saleId}`);
      }

      const returnNumber = `RTN-${Date.now()}`;

      // Step B: Create the SaleReturn document
      const saleReturn = new SaleReturn({
        returnNumber,
        originalSaleId: sale._id,
        customerId: sale.customerId,
        refundAmount,
        notes,
      });
      await saleReturn.save({ session });

      // Step C: Update the ProductUnit: { status: 'DEFECTIVE' }
      await ProductUnit.updateOne(
        { _id: unit._id },
        { $set: { status: 'DEFECTIVE' } },
        { session }
      );

      // Step D: Refund the Khata: Customer.findByIdAndUpdate
      await Customer.findByIdAndUpdate(
        sale.customerId,
        { $inc: { outstandingBalance: -refundAmount } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      logger.info(`Return processed successfully for ${serialNumber}`, { returnNumber });
      return saleReturn;
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      logger.error('Error processing return', { error: error.message });
      throw error;
    }
  }
}
