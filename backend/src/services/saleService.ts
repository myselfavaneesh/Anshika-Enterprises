import prisma from '../prisma';
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
    try {
      const sale = await prisma.$transaction(async (tx) => {
        const { customerId, items, discount, grandTotal, amountPaid, paymentMode } = data;
        // Generate Sequential Invoice Number
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const nextYear = (date.getFullYear() + 1).toString().slice(-2);
        const prefix = `INV/${year}-${nextYear}/`;
        
        const lastSale = await tx.sale.findFirst({
          where: { invoiceNumber: { startsWith: prefix } },
          orderBy: { createdAt: 'desc' }
        });

        let nextCount = 1;
        if (lastSale) {
          const lastNumber = parseInt(lastSale.invoiceNumber.replace(prefix, ''), 10);
          if (!isNaN(lastNumber)) {
            nextCount = lastNumber + 1;
          }
        }
        const invoiceNumber = `${prefix}${nextCount.toString().padStart(4, '0')}`;

        // Server-side Math Validation
        let expectedSubtotal = 0;
        let expectedTaxableAmount = 0;
        let expectedTaxAmount = 0;

        for (const item of items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
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
        const newSale = await tx.sale.create({
          data: {
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
          }
        });

        // 2. Process items & Update ProductUnits
        for (const item of items) {
          if (!item.serialNumbers || item.serialNumbers.length !== item.quantity) {
            throw new Error(`Please provide exactly ${item.quantity} serial numbers for product ID: ${item.productId}`);
          }

          const saleItem = await tx.saleItem.create({
            data: {
              saleId: newSale.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              taxableUnitPrice: item.taxableUnitPrice,
              taxableTotalPrice: item.taxableTotalPrice,
            }
          });

          for (const serial of item.serialNumbers) {
            const updatedUnit = await tx.productUnit.updateMany({
              where: { serialNumber: serial, status: 'IN_STOCK' },
              data: { status: 'SOLD', saleId: newSale.id, saleItemId: saleItem.id }
            });

            if (updatedUnit.count === 0) {
              throw new Error(`Serial number ${serial} is already sold or unavailable.`);
            }
          }
        }

        // 3. Ledger Logic (Khata Sync)
        // Step A: Increase the customer's balance by the invoice grandTotal
        const updatedCustomer = await tx.customer.update({
          where: { id: customerId },
          data: { outstandingBalance: { increment: expectedGrandTotal } }
        });

        // Step B: If money is paid, create Payment and reduce the balance
        if (amountPaid > 0) {
          await tx.payment.create({
            data: {
              entityType: 'CUSTOMER',
              entityId: customerId,
              type: 'MONEY_IN',
              amount: amountPaid,
              paymentMode: paymentMode || 'CASH',
              referenceId: invoiceNumber,
              notes: `Payment for Sale ${invoiceNumber}`,
            }
          });

          await tx.customer.update({
            where: { id: customerId },
            data: { outstandingBalance: { decrement: amountPaid } }
          });
        }

        return newSale;
      });

      logger.info('Sale completed successfully', { saleId: sale.id, invoiceNumber: sale.invoiceNumber });
      return sale;
    } catch (error: any) {
      logger.error('Error during createSale', { error: error.message });
      throw error;
    }
  }

  static async deleteSale(saleId: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.findUnique({ where: { id: saleId } });
        if (!sale) throw new Error('Sale not found');

        // 1. Revert ProductUnit statuses
        await tx.productUnit.updateMany({
          where: { saleId: sale.id },
          data: { status: 'IN_STOCK', saleId: null, saleItemId: null }
        });

        // 2. Delete SaleItems
        await tx.saleItem.deleteMany({ where: { saleId: sale.id } });

        // 3. Find and delete associated Payment
        const payment = await tx.payment.findFirst({ where: { referenceId: sale.invoiceNumber, entityType: 'CUSTOMER' } });
        if (payment) {
          await tx.payment.delete({ where: { id: payment.id } });
          // Revert the payment deduction
          await tx.customer.update({
            where: { id: sale.customerId },
            data: { outstandingBalance: { increment: payment.amount } }
          });
        }

        // 4. Revert Customer balance (Revert the grandTotal addition)
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { outstandingBalance: { decrement: sale.grandTotal } }
        });

        // 5. Delete Sale
        await tx.sale.delete({ where: { id: sale.id } });
      });

      logger.info('Sale deleted successfully', { saleId });
    } catch (error: any) {
      logger.error('Error deleting sale', { error: error.message });
      throw error;
    }
  }
}
