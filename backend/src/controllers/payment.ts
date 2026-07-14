import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Payment from '../models/Payment';
import Customer from '../models/Customer';
import Supplier from '../models/Supplier';
import Sale from '../models/Sale';
import Purchase from '../models/Purchase';

// Record a new payment and update the ledger balance securely
export const recordPayment = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { entityType, entityId, type, amount, paymentMode, referenceId, notes } = req.body;

    if (!['CUSTOMER', 'SUPPLIER'].includes(entityType)) {
      throw new Error('Invalid entityType. Must be CUSTOMER or SUPPLIER');
    }
    if (!['MONEY_IN', 'MONEY_OUT'].includes(type)) {
      throw new Error('Invalid type. Must be MONEY_IN or MONEY_OUT');
    }

    // 1. Create the payment record
    const payment = new Payment({
      entityType,
      entityId,
      type,
      amount: Number(amount),
      paymentMode,
      referenceId,
      notes,
    });
    
    await payment.save({ session });

    // 2. Update the outstanding balance
    // MONEY_IN means we received money (decreases customer due, or means we got a refund from supplier)
    // MONEY_OUT means we paid money (increases customer due if refund, or decreases supplier due)
    
    // Ledger Logic: 
    // For CUSTOMER: 
    //   Outstanding Balance is what they owe us.
    //   MONEY_IN (Customer pays us) -> Decreases balance
    //   MONEY_OUT (We refund customer) -> Increases balance
    
    // For SUPPLIER:
    //   Outstanding Balance is what we owe them.
    //   MONEY_OUT (We pay supplier) -> Decreases balance
    //   MONEY_IN (Supplier refunds us) -> Increases balance

    let balanceChange = 0;
    if (entityType === 'CUSTOMER') {
      balanceChange = type === 'MONEY_IN' ? -amount : amount;
      
      const updatedCustomer = await Customer.findByIdAndUpdate(
        entityId,
        { $inc: { outstandingBalance: balanceChange } },
        { session, new: true }
      );
      if (!updatedCustomer) throw new Error('Customer not found');

    } else if (entityType === 'SUPPLIER') {
      balanceChange = type === 'MONEY_OUT' ? -amount : amount;
      
      const updatedSupplier = await Supplier.findByIdAndUpdate(
        entityId,
        { $inc: { outstandingBalance: balanceChange } },
        { session, new: true }
      );
      if (!updatedSupplier) throw new Error('Supplier not found');
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(payment);
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error in recordPayment transaction:', error);
    
    // Fallback for Standalone MongoDB clusters (which don't support transactions)
    if (error.message && error.message.includes('Transaction numbers are only allowed on a replica set member or mongos')) {
       // Attempt non-transactional fallback if required, but for strict integrity we just return error
       res.status(500).json({ error: 'MongoDB Replica Set required for Ledger Transactions. Please configure MongoDB.' });
       return;
    }

    if (error.code === 11000 && error.keyPattern && error.keyPattern.referenceId) {
      res.status(400).json({ error: 'This UPI/Bank Reference Number has already been used in another transaction.' });
      return;
    }

    res.status(400).json({ error: error.message || 'Error recording payment' });
  }
};

// Get ledger for a specific entity
export const getLedger = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityId, entityType } = req.query;
    
    if (!entityId || !entityType) {
       res.status(400).json({ error: 'entityId and entityType are required' });
       return;
    }

    const payments = await Payment.find({ 
      entityId: entityId as any, 
      entityType: entityType as any 
    }).lean();

    let invoices: any[] = [];
    if (entityType === 'CUSTOMER') {
      invoices = await Sale.find({ customerId: entityId as any }).lean();
    } else if (entityType === 'SUPPLIER') {
      invoices = await Purchase.find({ supplierId: entityId as any }).lean();
    }

    // Transform payments
    const ledgerEntries = payments.map(p => ({
      _id: p._id,
      date: p.createdAt,
      type: 'PAYMENT',
      description: `Payment (${p.paymentMode})`,
      reference: p.referenceId || '-',
      amountIn: p.type === 'MONEY_IN' ? p.amount : 0,
      amountOut: p.type === 'MONEY_OUT' ? p.amount : 0,
    }));

    // Transform invoices
    const invoiceEntries = invoices.map(inv => {
      if (entityType === 'CUSTOMER') {
        return {
          _id: inv._id,
          date: inv.createdAt,
          type: 'SALE',
          description: 'Sale Invoice',
          reference: inv.invoiceNumber,
          amountIn: 0,
          amountOut: inv.grandTotal, // Sale increases what they owe us (like MONEY_OUT from our perspective? No, "amountOut" = they owe us more? Let's use debit/credit)
        };
      } else {
        return {
          _id: inv._id,
          date: inv.createdAt,
          type: 'PURCHASE',
          description: 'Purchase Invoice',
          reference: inv.purchaseInvoiceNumber,
          amountIn: inv.grandTotal, // Purchase means we owe them more
          amountOut: 0,
        };
      }
    });

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
         id: p._id,
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
          id: inv._id,
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
  } catch (error) {
    console.error('Error fetching ledger:', error);
    res.status(500).json({ error: 'Error fetching ledger' });
  }
};

export const deletePayment = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const payment = await Payment.findById(id).session(session);
    
    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    // Revert balance
    let balanceChange = 0;
    if (payment.entityType === 'CUSTOMER') {
      // Original logic: MONEY_IN (-amount), MONEY_OUT (+amount)
      // Reverse: MONEY_IN (+amount), MONEY_OUT (-amount)
      balanceChange = payment.type === 'MONEY_IN' ? payment.amount : -payment.amount;
      await Customer.findByIdAndUpdate(
        payment.entityId,
        { $inc: { outstandingBalance: balanceChange } },
        { session }
      );
    } else if (payment.entityType === 'SUPPLIER') {
      // Original logic: MONEY_OUT (-amount), MONEY_IN (+amount)
      // Reverse: MONEY_OUT (+amount), MONEY_IN (-amount)
      balanceChange = payment.type === 'MONEY_OUT' ? payment.amount : -payment.amount;
      await Supplier.findByIdAndUpdate(
        payment.entityId,
        { $inc: { outstandingBalance: balanceChange } },
        { session }
      );
    }

    await Payment.deleteOne({ _id: payment._id }, { session });

    await session.commitTransaction();
    session.endSession();
    res.json({ message: 'Payment deleted successfully' });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};
