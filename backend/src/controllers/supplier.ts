import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Supplier from '../models/Supplier';
import { logger } from '../utils/logger';

export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const suppliers = await Supplier.find();
    res.json(suppliers);
  } catch (error: any) {
    logger.error('Error fetching suppliers', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const createSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, address, gstNumber, state, stateCode, outstandingBalance } = req.body;
    const supplier = new Supplier({ name, phone, address, gstNumber, state, stateCode, outstandingBalance });
    await supplier.save();
    res.status(201).json(supplier);
  } catch (error: any) {
    logger.error('Error creating supplier', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, address, gstNumber, state, stateCode, outstandingBalance } = req.body;
    const supplier = await Supplier.findByIdAndUpdate(id, { name, phone, address, gstNumber, state, stateCode, outstandingBalance }, { new: true });
    if (!supplier) {
      res.status(404).json({ error: 'Supplier not found' });
      return;
    }
    res.json(supplier);
  } catch (error: any) {
    logger.error('Error updating supplier', { supplierId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const getSupplierLedger = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findById(id).lean();
    if (!supplier) {
      res.status(404).json({ error: 'Supplier not found' });
      return;
    }

    // 1. Fetch Purchases with PurchaseItems and Product info
    const purchasesRaw = await mongoose.model('Purchase').find({ supplierId: id }).lean();
    const purchases = await Promise.all(purchasesRaw.map(async (purchase: any) => {
      const itemsRaw = await mongoose.model('PurchaseItem').find({ purchaseId: purchase._id }).populate('productId').lean();
      
      const items = await Promise.all(itemsRaw.map(async (item: any) => {
        const units = await mongoose.model('ProductUnit').find({ purchaseItemId: item._id }).select('serialNumber').lean();
        return {
          ...item,
          serialNumbers: units.map((u: any) => u.serialNumber)
        };
      }));

      return {
        _id: purchase._id,
        date: purchase.createdAt,
        type: 'PURCHASE',
        invoiceNumber: purchase.purchaseInvoiceNumber,
        grandTotal: purchase.grandTotal,
        items,
        status: purchase.status,
      };
    }));

    // 2. Fetch Payments
    const paymentsRaw = await mongoose.model('Payment').find({ entityId: id, entityType: 'SUPPLIER' }).lean();
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
    const combined = [...purchases, ...payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 4. Calculate Running Balance
    let runningBalance = 0;
    const ledger = combined.map((entry: any) => {
      if (entry.type === 'PURCHASE') {
        runningBalance += entry.grandTotal; // We owe supplier more
      } else if (entry.type === 'PAYMENT') {
        if (entry.paymentType === 'MONEY_OUT') {
          runningBalance -= entry.amount; // We paid supplier
        } else if (entry.paymentType === 'MONEY_IN') {
          runningBalance += entry.amount; // Supplier refunded us
        }
      }
      return {
        ...entry,
        runningBalance
      };
    });

    res.json({
      supplier,
      ledger
    });
  } catch (error: any) {
    logger.error('Error fetching supplier ledger', { supplierId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};
