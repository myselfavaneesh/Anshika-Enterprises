import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { mapEntityId } from '../utils/mapper';
import { LedgerService } from '../services/ledgerService';

const SupplierSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().max(20).optional().nullable(),
  email: z.preprocess((val) => (val === '' ? null : val), z.string().email().max(255).optional().nullable()),
  address: z.string().max(500).optional().nullable(),
  gstNumber: z.string().max(20).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  stateCode: z.string().max(10).optional().nullable(),
  group: z.string().max(50).optional().nullable(),
  creditLimit: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().nonnegative().optional().nullable()),
  outstandingBalance: z.number().default(0),
});

export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { deletedAt: null }
    });
    res.json(mapEntityId(suppliers));
  } catch (error: any) {
    logger.error('Error fetching suppliers', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const createSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, email, address, gstNumber, state, stateCode, group, creditLimit, outstandingBalance } = SupplierSchema.parse(req.body);

    const trimmedPhone = phone ? phone.trim() : null;
    const trimmedEmail = email ? email.trim() : null;

    if (trimmedPhone || trimmedEmail) {
      const orConditions: any[] = [];
      if (trimmedPhone) orConditions.push({ phone: trimmedPhone });
      if (trimmedEmail) orConditions.push({ email: trimmedEmail });

      const existingSupplier = await prisma.supplier.findFirst({
        where: { OR: orConditions }
      });

      if (existingSupplier) {
        if (trimmedPhone && existingSupplier.phone === trimmedPhone) {
          res.status(400).json({ error: `Is phone number (${trimmedPhone}) ke saath supplier pehle se maujood hai.` });
          return;
        }
        if (trimmedEmail && existingSupplier.email === trimmedEmail) {
          res.status(400).json({ error: `Is email id (${trimmedEmail}) ke saath supplier pehle se maujood hai.` });
          return;
        }
      }
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        phone: trimmedPhone,
        email: trimmedEmail,
        address,
        gstNumber,
        state,
        stateCode,
        group,
        creditLimit: creditLimit !== undefined && creditLimit !== null ? Number(creditLimit) : null,
        outstandingBalance: outstandingBalance !== undefined ? Number(outstandingBalance) : 0,
      }
    });
    res.status(201).json(mapEntityId(supplier));
  } catch (error: any) {
    logger.error('Error creating supplier', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, gstNumber, state, stateCode, group, creditLimit, outstandingBalance } = SupplierSchema.parse(req.body);

    const trimmedPhone = phone ? phone.trim() : null;
    const trimmedEmail = email ? email.trim() : null;

    if (trimmedPhone || trimmedEmail) {
      const orConditions: any[] = [];
      if (trimmedPhone) orConditions.push({ phone: trimmedPhone });
      if (trimmedEmail) orConditions.push({ email: trimmedEmail });

      const existingSupplier = await prisma.supplier.findFirst({
        where: {
          NOT: { id: id as string },
          OR: orConditions
        }
      });

      if (existingSupplier) {
        if (trimmedPhone && existingSupplier.phone === trimmedPhone) {
          res.status(400).json({ error: `Is phone number (${trimmedPhone}) ke saath doosra supplier maujood hai.` });
          return;
        }
        if (trimmedEmail && existingSupplier.email === trimmedEmail) {
          res.status(400).json({ error: `Is email id (${trimmedEmail}) ke saath doosra supplier maujood hai.` });
          return;
        }
      }
    }
    
    try {
      const supplier = await prisma.supplier.update({
        where: { id: id as string },
        data: {
          name,
          phone: trimmedPhone,
          email: trimmedEmail,
          address,
          gstNumber,
          state,
          stateCode,
          group,
          ...(creditLimit !== undefined && { creditLimit: creditLimit !== null ? Number(creditLimit) : null }),
          ...(outstandingBalance !== undefined && { outstandingBalance: Number(outstandingBalance) }),
        }
      });
      res.json(mapEntityId(supplier));
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
    const result = await LedgerService.getSupplierLedger(id as string);
    if (!result) {
      res.status(404).json({ error: 'Supplier not found' });
      return;
    }

    res.json(result);
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
      await prisma.supplier.update({ 
        where: { id: id as string },
        data: { deletedAt: new Date() }
      });
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
