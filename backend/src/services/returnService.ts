import prisma from '../prisma';
import { logger } from '../utils/logger';

export class ReturnService {
  static async processReturn(saleId: string, serialNumber: string, refundAmount: number, notes?: string): Promise<any> {
    try {
      const saleReturn = await prisma.$transaction(async (tx) => {
        // Step A: Verify the ProductUnit exists with the given serialNumber and saleId
        const unit = await tx.productUnit.findFirst({
          where: { serialNumber, saleId, status: 'SOLD' }
        });
        if (!unit) {
          throw new Error(`Serial number ${serialNumber} is not associated with this sale or is already marked defective.`);
        }

        const sale = await tx.sale.findUnique({ where: { id: saleId } });
        if (!sale) {
          throw new Error(`Sale not found: ${saleId}`);
        }

        const returnNumber = `RTN-${Date.now()}`;

        // Step B: Create the SaleReturn document
        const newReturn = await tx.saleReturn.create({
          data: {
            returnNumber,
            originalSaleId: sale.id,
            customerId: sale.customerId,
            refundAmount,
            notes,
          }
        });

        // Step C: Update the ProductUnit: { status: 'DEFECTIVE' }
        await tx.productUnit.update({
          where: { id: unit.id },
          data: { status: 'DEFECTIVE' }
        });

        // Step D: Refund the Khata: Customer.findByIdAndUpdate
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { outstandingBalance: { decrement: refundAmount } }
        });

        return newReturn;
      });

      logger.info(`Return processed successfully for ${serialNumber}`, { returnNumber: saleReturn.returnNumber });
      return saleReturn;
    } catch (error: any) {
      logger.error('Error processing return', { error: error.message });
      throw error;
    }
  }
}
