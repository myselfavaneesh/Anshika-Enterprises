import prisma from '../prisma';
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
    try {
      const purchase = await prisma.$transaction(async (tx) => {
        const { 
          purchaseInvoiceNumber, supplierId, items, subtotal, discount, 
          taxableAmount, taxRate, taxAmount, cgstAmount, sgstAmount, 
          grandTotal, amountPaid, paymentMode 
        } = data;

        // 1. Create Purchase
        const newPurchase = await tx.purchase.create({
          data: {
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
          }
        });

        // 2. Process items & Create ProductUnits
        for (const item of items) {
          if (!item.serialNumbers || item.serialNumbers.length !== item.quantity) {
            throw new Error(`Please provide exactly ${item.quantity} serial numbers for product ID: ${item.productId}`);
          }

          const purchaseItem = await tx.purchaseItem.create({
            data: {
              purchaseId: newPurchase.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              taxableUnitPrice: item.taxableUnitPrice,
              taxableTotalPrice: item.taxableTotalPrice,
            }
          });

          // Add ProductUnits to Inventory
          const unitsToInsert = item.serialNumbers.map(sn => ({
            productId: item.productId,
            serialNumber: sn,
            status: 'IN_STOCK',
            purchaseId: newPurchase.id,
            purchaseItemId: purchaseItem.id,
            supplierId: supplierId,
          }));
          
          await tx.productUnit.createMany({
            data: unitsToInsert
          });
        }

        // 3. Ledger Logic (Khata Sync)
        // Step A: Increase what we owe the supplier by grandTotal
        const updatedSupplier = await tx.supplier.update({
          where: { id: supplierId },
          data: { outstandingBalance: { increment: grandTotal } }
        });

        // Step B: If money is paid, create Payment and reduce what we owe
        if (amountPaid > 0) {
          await tx.payment.create({
            data: {
              entityType: 'SUPPLIER',
              entityId: supplierId,
              type: 'MONEY_OUT',
              amount: amountPaid,
              paymentMode: paymentMode || 'CASH',
              referenceId: purchaseInvoiceNumber,
              notes: `Payment for Purchase Invoice ${purchaseInvoiceNumber}`,
            }
          });

          await tx.supplier.update({
            where: { id: supplierId },
            data: { outstandingBalance: { decrement: amountPaid } }
          });
        }

        return newPurchase;
      });

      logger.info('Purchase completed successfully', { purchaseId: purchase.id, purchaseInvoiceNumber: purchase.purchaseInvoiceNumber });
      return purchase;
    } catch (error: any) {
      logger.error('Error during createPurchase', { error: error.message });
      throw error;
    }
  }

  static async deletePurchase(purchaseId: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const purchase = await tx.purchase.findUnique({ where: { id: purchaseId } });
        if (!purchase) throw new Error('Purchase not found');

        // 1. Delete ProductUnits
        await tx.productUnit.deleteMany({ where: { purchaseId: purchase.id } });

        // 2. Delete PurchaseItems
        await tx.purchaseItem.deleteMany({ where: { purchaseId: purchase.id } });

        // 3. Find and delete associated Payment
        const payment = await tx.payment.findFirst({ where: { referenceId: purchase.purchaseInvoiceNumber, entityType: 'SUPPLIER' } });
        let amountPaid = 0;
        if (payment) {
          amountPaid = payment.amount;
          await tx.payment.delete({ where: { id: payment.id } });
        }

        // 4. Revert Supplier balance
        const amountDue = purchase.grandTotal - amountPaid;
        await tx.supplier.update({
          where: { id: purchase.supplierId },
          data: { outstandingBalance: { decrement: amountDue } }
        });

        // 5. Delete Purchase
        await tx.purchase.delete({ where: { id: purchase.id } });
      });

      logger.info('Purchase deleted successfully', { purchaseId });
    } catch (error: any) {
      logger.error('Error deleting purchase', { error: error.message });
      throw error;
    }
  }
}
