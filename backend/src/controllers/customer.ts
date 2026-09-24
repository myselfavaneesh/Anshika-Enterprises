import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { mapEntityId } from '../utils/mapper';
import { LedgerService } from '../services/ledgerService';

const CustomerSchema = z.object({
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

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { deletedAt: null }
    });
    res.json(mapEntityId(customers));
  } catch (error: any) {
    logger.error('Error fetching customers', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, email, address, gstNumber, state, stateCode, group, creditLimit, outstandingBalance } = CustomerSchema.parse(req.body);

    const trimmedPhone = phone ? phone.trim() : null;
    const trimmedEmail = email ? email.trim() : null;

    if (trimmedPhone || trimmedEmail) {
      const orConditions: any[] = [];
      if (trimmedPhone) orConditions.push({ phone: trimmedPhone });
      if (trimmedEmail) orConditions.push({ email: trimmedEmail });

      const existingCustomer = await prisma.customer.findFirst({
        where: { OR: orConditions }
      });

      if (existingCustomer) {
        if (trimmedPhone && existingCustomer.phone === trimmedPhone) {
          res.status(400).json({ error: `Is phone number (${trimmedPhone}) ke saath customer pehle se maujood hai.` });
          return;
        }
        if (trimmedEmail && existingCustomer.email === trimmedEmail) {
          res.status(400).json({ error: `Is email id (${trimmedEmail}) ke saath customer pehle se maujood hai.` });
          return;
        }
      }
    }

    const customer = await prisma.customer.create({
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
      },
    });
    res.status(201).json(mapEntityId(customer));
  } catch (error: any) {
    logger.error('Error creating customer', { error: error.message, stack: error.stack });
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.issues });
      return;
    }
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, gstNumber, state, stateCode, group, creditLimit, outstandingBalance } = CustomerSchema.parse(req.body);

    const trimmedPhone = phone ? phone.trim() : null;
    const trimmedEmail = email ? email.trim() : null;

    if (trimmedPhone || trimmedEmail) {
      const orConditions: any[] = [];
      if (trimmedPhone) orConditions.push({ phone: trimmedPhone });
      if (trimmedEmail) orConditions.push({ email: trimmedEmail });

      const existingCustomer = await prisma.customer.findFirst({
        where: {
          NOT: { id: id as string },
          OR: orConditions
        }
      });

      if (existingCustomer) {
        if (trimmedPhone && existingCustomer.phone === trimmedPhone) {
          res.status(400).json({ error: `Is phone number (${trimmedPhone}) ke saath doosra customer maujood hai.` });
          return;
        }
        if (trimmedEmail && existingCustomer.email === trimmedEmail) {
          res.status(400).json({ error: `Is email id (${trimmedEmail}) ke saath doosra customer maujood hai.` });
          return;
        }
      }
    }
    
    const customer = await prisma.customer.update({
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
      },
    });
    
    res.json(mapEntityId(customer));
  } catch (error: any) {
    if (error.code === 'P2025') { // Prisma code for record not found
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    logger.error('Error updating customer', { customerId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const getCustomerLedger = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await LedgerService.getCustomerLedger(id as string);
    
    if (!result) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.json(result);
  } catch (error: any) {
    logger.error('Error fetching customer ledger', { customerId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const salesCount = await prisma.sale.count({ where: { customerId: id as string } });
    const paymentsCount = await prisma.payment.count({ where: { entityId: id as string, entityType: 'CUSTOMER' } });
    
    if (salesCount > 0 || paymentsCount > 0) {
      res.status(400).json({ error: 'Cannot delete customer with associated sales or payments.' });
      return;
    }

    try {
      await prisma.customer.update({ 
        where: { id: id as string },
        data: { deletedAt: new Date() }
      });
      res.json({ message: 'Customer deleted' });
    } catch (e: any) {
      if (e.code === 'P2025') {
        res.status(404).json({ error: 'Customer not found' });
      } else {
        throw e;
      }
    }
  } catch (error: any) {
    logger.error('Error deleting customer', { customerId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};
