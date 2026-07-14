import { Request, Response } from 'express';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { mapToMongoose } from '../utils/mapper';

export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany();
    res.json(mapToMongoose(suppliers));
  } catch (error: any) {
    logger.error('Error fetching suppliers', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const createSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, address, gstNumber, state, stateCode, outstandingBalance } = req.body;
    const supplier = await prisma.supplier.create({
      data: {
        name,
        phone,
        address,
        gstNumber,
        state,
        stateCode,
        outstandingBalance: outstandingBalance !== undefined ? Number(outstandingBalance) : 0,
      }
    });
    res.status(201).json(mapToMongoose(supplier));
  } catch (error: any) {
    logger.error('Error creating supplier', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, address, gstNumber, state, stateCode, outstandingBalance } = req.body;
    
    try {
      const supplier = await prisma.supplier.update({
        where: { id: id as string },
        data: {
          name,
          phone,
          address,
          gstNumber,
          state,
          stateCode,
          ...(outstandingBalance !== undefined && { outstandingBalance: Number(outstandingBalance) }),
        }
      });
      res.json(mapToMongoose(supplier));
    } catch (e: any) {
      if (e.code === 'P2025') {
        res.status(404).json({ error: 'Supplier not found' });
      } else {
        throw e;
      }
    }
  } catch (error: any) {
    logger.error('Error updating supplier', { supplierId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const getSupplierLedger = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const supplier = await prisma.supplier.findUnique({ where: { id: id as string } });
    if (!supplier) {
      res.status(404).json({ error: 'Supplier not found' });
      return;
    }

    // 1. Fetch Purchases with PurchaseItems and Product info
    const purchasesRaw = await prisma.purchase.findMany({
      where: { supplierId: id as string },
      include: {
        purchaseItems: {
          include: {
            product: true,
            productUnits: {
              select: { serialNumber: true }
            }
          }
        }
      }
    });

    const purchases = purchasesRaw.map(purchase => {
      const items = purchase.purchaseItems.map((item: any) => {
        const { product, productUnits, ...itemRest } = item;
        return {
          ...mapToMongoose(itemRest),
          productId: mapToMongoose(product),
          serialNumbers: productUnits.map((u: any) => u.serialNumber)
        };
      });

      return {
        _id: purchase.id,
        date: purchase.createdAt,
        type: 'PURCHASE',
        invoiceNumber: purchase.purchaseInvoiceNumber,
        grandTotal: purchase.grandTotal,
        items,
        status: purchase.status,
      };
    });

    // 2. Fetch Payments
    const paymentsRaw = await prisma.payment.findMany({
      where: { entityId: id as string, entityType: 'SUPPLIER' }
    });
    
    const payments = paymentsRaw.map(payment => ({
      _id: payment.id,
      date: payment.createdAt,
      type: 'PAYMENT',
      paymentType: payment.type, // 'MONEY_IN' or 'MONEY_OUT'
      amount: payment.amount,
      paymentMode: payment.paymentMode,
      referenceId: payment.referenceId,
      notes: payment.notes,
    }));

    // 3. Combine and Sort
    const combined: any[] = [...purchases, ...payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 4. Calculate Running Balance
    let runningBalance = 0;
    const ledger = combined.map(entry => {
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
      supplier: mapToMongoose(supplier),
      ledger
    });
  } catch (error: any) {
    logger.error('Error fetching supplier ledger', { supplierId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const purchasesCount = await prisma.purchase.count({ where: { supplierId: id as string } });
    const paymentsCount = await prisma.payment.count({ where: { entityId: id as string, entityType: 'SUPPLIER' } });
    
    if (purchasesCount > 0 || paymentsCount > 0) {
      res.status(400).json({ error: 'Cannot delete supplier with associated purchases or payments.' });
      return;
    }

    try {
      await prisma.supplier.delete({ where: { id: id as string } });
      res.json({ message: 'Supplier deleted' });
    } catch (e: any) {
      if (e.code === 'P2025') {
        res.status(404).json({ error: 'Supplier not found' });
      } else {
        throw e;
      }
    }
  } catch (error: any) {
    logger.error('Error deleting supplier', { supplierId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};
