import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Customer from '../models/Customer';
import { logger } from '../utils/logger';

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (error: any) {
    logger.error('Error fetching customers', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, address, gstNumber, state, stateCode, outstandingBalance } = req.body;
    const customer = new Customer({ name, phone, address, gstNumber, state, stateCode, outstandingBalance });
    await customer.save();
    res.status(201).json(customer);
  } catch (error: any) {
    logger.error('Error creating customer', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, address, gstNumber, state, stateCode, outstandingBalance } = req.body;
    const customer = await Customer.findByIdAndUpdate(id, { name, phone, address, gstNumber, state, stateCode, outstandingBalance }, { new: true });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json(customer);
  } catch (error: any) {
    logger.error('Error updating customer', { customerId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const getCustomerLedger = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id).lean();
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // 1. Fetch Sales with SaleItems and Product info
    const salesRaw = await mongoose.model('Sale').find({ customerId: id }).lean();
    const sales = await Promise.all(salesRaw.map(async (sale: any) => {
      const itemsRaw = await mongoose.model('SaleItem').find({ saleId: sale._id }).populate('productId').lean();
      
      const items = await Promise.all(itemsRaw.map(async (item: any) => {
        const units = await mongoose.model('ProductUnit').find({ saleItemId: item._id }).select('serialNumber').lean();
        return {
          ...item,
          serialNumbers: units.map((u: any) => u.serialNumber)
        };
      }));

      return {
        _id: sale._id,
        date: sale.createdAt,
        type: 'SALE',
        invoiceNumber: sale.invoiceNumber,
        grandTotal: sale.grandTotal,
        items,
        status: sale.status,
      };
    }));

    // 2. Fetch Payments
    const paymentsRaw = await mongoose.model('Payment').find({ entityId: id, entityType: 'CUSTOMER' }).lean();
    const payments = paymentsRaw.map((payment: any) => ({
      _id: payment._id,
      date: payment.createdAt,
      type: 'PAYMENT',
      paymentType: payment.type, // 'MONEY_IN' or 'MONEY_OUT'
      amount: payment.amount,
      paymentMode: payment.paymentMode,
      referenceId: payment.referenceId,
      notes: payment.notes,
    }));

    // 3. Combine and Sort
    const combined = [...sales, ...payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 4. Calculate Running Balance
    let runningBalance = 0;
    const ledger = combined.map((entry: any) => {
      if (entry.type === 'SALE') {
        runningBalance += entry.grandTotal; // Customer owes more
      } else if (entry.type === 'PAYMENT') {
        if (entry.paymentType === 'MONEY_IN') {
          runningBalance -= entry.amount; // Customer paid us
        } else if (entry.paymentType === 'MONEY_OUT') {
          runningBalance += entry.amount; // We refunded customer
        }
      }
      return {
        ...entry,
        runningBalance
      };
    });

    res.json({
      customer,
      ledger
    });
  } catch (error: any) {
    logger.error('Error fetching customer ledger', { customerId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};
