import { Request, Response } from 'express';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { mapToMongoose } from '../utils/mapper';

// Record a new payment and update the ledger balance securely
export const recordPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId, type, amount, paymentMode, referenceId, notes } = req.body;

    if (!['CUSTOMER', 'SUPPLIER'].includes(entityType)) {
      res.status(400).json({ error: 'Invalid entityType. Must be CUSTOMER or SUPPLIER' });
      return;
    }
    if (!['MONEY_IN', 'MONEY_OUT'].includes(type)) {
      res.status(400).json({ error: 'Invalid type. Must be MONEY_IN or MONEY_OUT' });
      return;
    }

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

    res.status(201).json(mapToMongoose(payment));
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

    res.status(400).json({ error: error.message || 'Error recording payment' });
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
    res.status(500).json({ error: error.message || 'Server error' });
  }
};
