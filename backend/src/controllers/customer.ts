import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { logger } from '../utils/logger';

const CustomerSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  gstNumber: z.string().max(20).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  stateCode: z.string().max(10).optional().nullable(),
  outstandingBalance: z.number().default(0),
});

const mapToMongoose = (obj: any) => {
  if (!obj) return obj;
  const { id, ...rest } = obj;
  return { ...rest, _id: id };
};

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany();
    res.json(customers.map(mapToMongoose));
  } catch (error: any) {
    logger.error('Error fetching customers', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, email, address, gstNumber, state, stateCode, outstandingBalance } = CustomerSchema.parse(req.body);

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
        outstandingBalance: outstandingBalance !== undefined ? Number(outstandingBalance) : 0,
      },
    });
    res.status(201).json(mapToMongoose(customer));
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
    const { name, phone, email, address, gstNumber, state, stateCode, outstandingBalance } = CustomerSchema.parse(req.body);

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
        ...(outstandingBalance !== undefined && { outstandingBalance: Number(outstandingBalance) }),
      },
    });
    
    res.json(mapToMongoose(customer));
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
    const customer = await prisma.customer.findUnique({ where: { id: id as string } });
    
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // 1. Fetch Sales with SaleItems and Product info
    const salesRaw = await prisma.sale.findMany({
      where: { customerId: id as string },
      include: {
        saleItems: {
          include: {
            product: true,
            productUnits: {
              select: { serialNumber: true }
            }
          }
        }
      }
    });

    const sales = salesRaw.map(sale => {
      const items = sale.saleItems.map((item: any) => {
        const { product, productUnits, ...itemRest } = item;
        return {
          ...mapToMongoose(itemRest),
          productId: mapToMongoose(product),
          serialNumbers: productUnits.map((u: any) => u.serialNumber),
        };
      });

      return {
        _id: sale.id,
        date: sale.createdAt,
        type: 'SALE',
        invoiceNumber: sale.invoiceNumber,
        grandTotal: sale.grandTotal,
        items,
        status: sale.status,
      };
    });

    // 2. Fetch Payments
    const paymentsRaw = await prisma.payment.findMany({
      where: { entityId: id as string, entityType: 'CUSTOMER' }
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
    const combined: any[] = [...sales, ...payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 4. Calculate Running Balance
    let runningBalance = 0;
    const ledger = combined.map(entry => {
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
      customer: mapToMongoose(customer),
      ledger
    });
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
      await prisma.customer.delete({ where: { id: id as string } });
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
