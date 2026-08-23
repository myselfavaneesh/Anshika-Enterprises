import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { mapEntityId } from '../utils/mapper';

const PaymentSchema = z.object({
  entityType: z.enum(['CUSTOMER', 'SUPPLIER']),
  entityId: z.string(),
  type: z.enum(['MONEY_IN', 'MONEY_OUT']),
  amount: z.number().positive(),
  paymentMode: z.string().min(1).max(50),
  referenceId: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

// Record a new payment and update the ledger balance securely
export const recordPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId, type, amount, paymentMode, referenceId, notes } = PaymentSchema.parse(req.body);

    const numAmount = Number(amount);

    const payment = await prisma.$transaction(async (tx) => {
      // 1. Create the payment record
      const newPayment = await tx.payment.create({
        data: {
          entityType,
          entityId,
          type,
          amount: numAmount,
          paymentMode,
          referenceId,
          notes,
        }
      });
      
      // 2. Update the outstanding balance
      let balanceChange = 0;
      if (entityType === 'CUSTOMER') {
        balanceChange = type === 'MONEY_IN' ? -numAmount : numAmount;
        await tx.customer.update({
          where: { id: entityId },
          data: { outstandingBalance: { increment: balanceChange } }
        });
      } else if (entityType === 'SUPPLIER') {
        balanceChange = type === 'MONEY_OUT' ? -numAmount : numAmount;
        await tx.supplier.update({
          where: { id: entityId },
          data: { outstandingBalance: { increment: balanceChange } }
        });
      }

      return newPayment;
    });

    res.status(201).json(mapEntityId(payment));
  } catch (error: any) {
    logger.error('Error in recordPayment transaction:', { error: error.message, stack: error.stack });
    
    if (error.code === 'P2002' && error.meta?.target?.includes('referenceId')) {
      res.status(400).json({ error: 'This UPI/Bank Reference Number has already been used in another transaction.' });
      return;
    }
    
    if (error.code === 'P2025') {
       res.status(404).json({ error: 'Entity (Customer/Supplier) not found' });
       return;
    }

    res.status(400).json({ error: 'Error recording payment' });
  }
};

const BulkPaymentSchema = z.array(PaymentSchema);

// Record multiple payments and update the ledger balance securely
export const bulkRecordPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const paymentsData = BulkPaymentSchema.parse(req.body);

    const payments = await prisma.$transaction(async (tx) => {
      const createdPayments = [];
      let customerBalances: Record<string, number> = {};
      let supplierBalances: Record<string, number> = {};

      for (const data of paymentsData) {
        const numAmount = Number(data.amount);
        
        const newPayment = await tx.payment.create({
          data: {
            entityType: data.entityType,
            entityId: data.entityId,
            type: data.type,
            amount: numAmount,
            paymentMode: data.paymentMode,
            referenceId: data.referenceId,
            notes: data.notes,
          }
        });
        createdPayments.push(newPayment);

        if (data.entityType === 'CUSTOMER') {
          const balanceChange = data.type === 'MONEY_IN' ? -numAmount : numAmount;
          customerBalances[data.entityId] = (customerBalances[data.entityId] || 0) + balanceChange;
        } else if (data.entityType === 'SUPPLIER') {
          const balanceChange = data.type === 'MONEY_OUT' ? -numAmount : numAmount;
          supplierBalances[data.entityId] = (supplierBalances[data.entityId] || 0) + balanceChange;
        }
      }

      for (const [entityId, change] of Object.entries(customerBalances)) {
        if (change !== 0) {
          await tx.customer.update({
            where: { id: entityId },
            data: { outstandingBalance: { increment: change } }
          });
        }
      }

      for (const [entityId, change] of Object.entries(supplierBalances)) {
        if (change !== 0) {
          await tx.supplier.update({
            where: { id: entityId },
            data: { outstandingBalance: { increment: change } }
          });
        }
      }

      return createdPayments;
    });

    res.status(201).json(payments.map(mapEntityId));
  } catch (error: any) {
    logger.error('Error in bulkRecordPayment transaction:', { error: error.message, stack: error.stack });
    
    if (error.code === 'P2002' && error.meta?.target?.includes('referenceId')) {
      res.status(400).json({ error: 'One or more UPI/Bank Reference Numbers have already been used.' });
      return;
    }
    
    if (error.code === 'P2025') {
       res.status(404).json({ error: 'Entity (Customer/Supplier) not found' });
       return;
    }

    res.status(400).json({ error: 'Error recording bulk payments' });
  }
};

// Get ledger for a specific entity
export const getLedger = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityId, entityType } = req.query;
    
    if (!entityId || typeof entityId !== 'string' || !entityType || typeof entityType !== 'string') {
       res.status(400).json({ error: 'entityId and entityType are required' });
       return;
    }

    const payments = await prisma.payment.findMany({ 
      where: { 
        entityId: entityId as string, 
        entityType: entityType as string
      }
    });

    let invoices: any[] = [];
    if (entityType === 'CUSTOMER') {
      invoices = await prisma.sale.findMany({ where: { customerId: entityId as string } });
    } else if (entityType === 'SUPPLIER') {
      invoices = await prisma.purchase.findMany({ where: { supplierId: entityId as string } });
    }

    // We need standard Debit/Credit for Khata:
    // For Customer: 
    // Debit (Dr) = Amount they owe us (Sales)
    // Credit (Cr) = Amount they paid us (Money In)
    
    // For Supplier:
    // Debit (Dr) = Amount we paid them (Money Out)
    // Credit (Cr) = Amount we owe them (Purchases)

    const allEntries = payments.map(p => {
       const isCustomer = entityType === 'CUSTOMER';
       return {
         id: p.id,
         _id: p.id, // Compatibility for frontend
         date: p.createdAt,
         type: 'PAYMENT',
         description: `Payment (${p.paymentMode})`,
         reference: p.referenceId || '-',
         debit: isCustomer ? (p.type === 'MONEY_OUT' ? p.amount : 0) : (p.type === 'MONEY_OUT' ? p.amount : 0),
         credit: isCustomer ? (p.type === 'MONEY_IN' ? p.amount : 0) : (p.type === 'MONEY_IN' ? p.amount : 0),
       };
    }).concat(
      invoices.map(inv => {
        const isCustomer = entityType === 'CUSTOMER';
        return {
          id: inv.id,
          _id: inv.id, // Compatibility for frontend
          date: inv.createdAt,
          type: isCustomer ? 'SALE' : 'PURCHASE',
          description: isCustomer ? 'Sale Invoice' : 'Purchase Invoice',
          reference: isCustomer ? inv.invoiceNumber : inv.purchaseInvoiceNumber,
          debit: isCustomer ? inv.grandTotal : 0, // Sale increases Customer's Debit
          credit: !isCustomer ? inv.grandTotal : 0, // Purchase increases Supplier's Credit
        };
      })
    );

    // Sort chronologically (oldest first) to calculate running balance
    allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let runningBalance = 0;
    const ledgerWithBalance = allEntries.map(entry => {
      // For Customer: Balance = Debit - Credit
      // For Supplier: Balance = Credit - Debit
      if (entityType === 'CUSTOMER') {
        runningBalance += (entry.debit - entry.credit);
      } else {
        runningBalance += (entry.credit - entry.debit);
      }
      return {
        ...entry,
        balance: runningBalance
      };
    });

    // Reverse so newest is on top
    ledgerWithBalance.reverse();

    res.status(200).json(ledgerWithBalance);
  } catch (error: any) {
    logger.error('Error fetching ledger:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Error fetching ledger' });
  }
};

const UpdatePaymentSchema = z.object({
  amount: z.number().positive().optional(),
  paymentMode: z.string().min(1).max(50).optional(),
  referenceId: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  type: z.enum(['MONEY_IN', 'MONEY_OUT']).optional(),
});

export const updatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = UpdatePaymentSchema.parse(req.body);

    const updatedPayment = await prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findUnique({ where: { id: id as string } });
      if (!existingPayment) {
        throw new Error('NOT_FOUND');
      }

      const newAmount = updateData.amount !== undefined ? Number(updateData.amount) : existingPayment.amount;
      const newType = updateData.type || existingPayment.type;

      const entityType = existingPayment.entityType;
      const entityId = existingPayment.entityId;

      let netBalanceChange = 0;

      if (entityType === 'CUSTOMER') {
        // Revert old effect (MONEY_IN decreased balance, MONEY_OUT increased it)
        const oldEffect = existingPayment.type === 'MONEY_IN' ? existingPayment.amount : -existingPayment.amount;
        // Apply new effect
        const newEffect = newType === 'MONEY_IN' ? -newAmount : newAmount;
        netBalanceChange = oldEffect + newEffect;

        if (netBalanceChange !== 0) {
          await tx.customer.update({
            where: { id: entityId },
            data: { outstandingBalance: { increment: netBalanceChange } }
          });
        }
      } else if (entityType === 'SUPPLIER') {
        // Revert old effect (MONEY_OUT decreased balance, MONEY_IN increased it)
        const oldEffect = existingPayment.type === 'MONEY_OUT' ? existingPayment.amount : -existingPayment.amount;
        // Apply new effect
        const newEffect = newType === 'MONEY_OUT' ? -newAmount : newAmount;
        netBalanceChange = oldEffect + newEffect;

        if (netBalanceChange !== 0) {
          await tx.supplier.update({
            where: { id: entityId },
            data: { outstandingBalance: { increment: netBalanceChange } }
          });
        }
      }

      const updated = await tx.payment.update({
        where: { id: id as string },
        data: {
          ...(updateData.amount !== undefined && { amount: newAmount }),
          ...(updateData.type && { type: newType }),
          ...(updateData.paymentMode && { paymentMode: updateData.paymentMode }),
          ...(updateData.referenceId !== undefined && { referenceId: updateData.referenceId }),
          ...(updateData.notes !== undefined && { notes: updateData.notes }),
        }
      });

      return updated;
    });

    res.json(mapEntityId(updatedPayment));
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Payment record not found' });
      return;
    }
    logger.error('Error updating payment:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Error updating payment' });
  }
};

export const deletePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: id as string } });
      
      if (!payment) {
        throw new Error('NOT_FOUND');
      }

      // Revert balance
      let balanceChange = 0;
      if (payment.entityType === 'CUSTOMER') {
        balanceChange = payment.type === 'MONEY_IN' ? payment.amount : -payment.amount;
        await tx.customer.update({
          where: { id: payment.entityId },
          data: { outstandingBalance: { increment: balanceChange } }
        });
      } else if (payment.entityType === 'SUPPLIER') {
        balanceChange = payment.type === 'MONEY_OUT' ? payment.amount : -payment.amount;
        await tx.supplier.update({
          where: { id: payment.entityId },
          data: { outstandingBalance: { increment: balanceChange } }
        });
      }

      await tx.payment.delete({ where: { id: payment.id } });
    });

    res.json({ message: 'Payment deleted successfully' });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }
    logger.error('Error deleting payment:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};
