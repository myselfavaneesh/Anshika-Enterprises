import { Request, Response } from 'express';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { mapToMongoose } from '../utils/mapper';

const generateQuotationNumber = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const nextYear = (date.getFullYear() + 1).toString().slice(-2);
  const prefix = `QT/${year}-${nextYear}/`;
  
  const lastQuotation = await prisma.quotation.findFirst({
    where: { quotationNumber: { startsWith: prefix } },
    orderBy: { createdAt: 'desc' }
  });

  let nextCount = 1;
  if (lastQuotation) {
    const lastNumber = parseInt(lastQuotation.quotationNumber.replace(prefix, ''), 10);
    if (!isNaN(lastNumber)) {
      nextCount = lastNumber + 1;
    }
  }

  const formattedCount = nextCount.toString().padStart(4, '0');
  return `${prefix}${formattedCount}`;
};

export const createQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, items, subtotal, discount, taxableAmount, taxRate, taxAmount, cgstAmount, sgstAmount, grandTotal, validUntil } = req.body;

    const quotationNumber = await generateQuotationNumber();

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        customerId,
        subtotal: Number(subtotal),
        discount: Number(discount),
        taxableAmount: Number(taxableAmount),
        taxRate: Number(taxRate),
        taxAmount: Number(taxAmount),
        cgstAmount: Number(cgstAmount),
        sgstAmount: Number(sgstAmount),
        grandTotal: Number(grandTotal),
        validUntil: validUntil ? new Date(validUntil) : null,
        status: 'DRAFT',
        quotationItems: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
            taxableUnitPrice: Number(item.taxableUnitPrice),
            taxableTotalPrice: Number(item.taxableTotalPrice),
          }))
        }
      },
      include: {
        quotationItems: true
      }
    });

    res.status(201).json(mapToMongoose(quotation));
  } catch (error: any) {
    logger.error('Error creating quotation', { error: error.message, stack: error.stack });
    res.status(400).json({ error: error.message || 'Error creating quotation' });
  }
};

export const getQuotations = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const search = typeof req.query.q === 'string' ? req.query.q : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      const customers = await prisma.customer.findMany({
        where: { 
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } }
          ]
        },
        select: { id: true }
      });
      const customerIds = customers.map(c => c.id);

      where.OR = [
        { quotationNumber: { contains: search, mode: 'insensitive' } },
        { customerId: { in: customerIds } }
      ];
    }

    const total = await prisma.quotation.count({ where });
    const quotations = await prisma.quotation.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const mappedQuotations = quotations.map(q => {
      const { customer, ...rest } = q as any;
      return mapToMongoose({ ...rest, customerId: customer });
    });

    res.json({
      data: mappedQuotations,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching quotations', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const getQuotationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const quotation = await prisma.quotation.findUnique({
      where: { id: id as string },
      include: {
        customer: true,
        quotationItems: {
          include: {
            product: true
          }
        }
      }
    });

    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    const { customer, quotationItems, ...restQuotation } = quotation as any;
    
    // Map items so productId is populated
    const mappedItems = quotationItems.map((item: any) => {
      const { product, ...restItem } = item;
      return mapToMongoose({ ...restItem, productId: product });
    });

    res.json(mapToMongoose({ ...restQuotation, customerId: customer, items: mappedItems }));
  } catch (error: any) {
    logger.error('Error fetching quotation details', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const quotation = await prisma.quotation.findUnique({ where: { id: id as string } });
    
    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: id as string } });
      await tx.quotation.delete({ where: { id: id as string } });
    });

    res.json({ message: 'Quotation deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting quotation', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { customerId, items, subtotal, discount, taxableAmount, taxRate, taxAmount, cgstAmount, sgstAmount, grandTotal, validUntil } = req.body;

    const quotation = await prisma.quotation.findUnique({ where: { id: id as string } });
    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    const updatedQuotation = await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.quotationItem.deleteMany({ where: { quotationId: id as string } });

      // Update quotation and recreate items
      return await tx.quotation.update({
        where: { id: id as string },
        data: {
          customerId,
          subtotal: Number(subtotal),
          discount: Number(discount),
          taxableAmount: Number(taxableAmount),
          taxRate: Number(taxRate),
          taxAmount: Number(taxAmount),
          cgstAmount: Number(cgstAmount),
          sgstAmount: Number(sgstAmount),
          grandTotal: Number(grandTotal),
          validUntil: validUntil ? new Date(validUntil) : null,
          quotationItems: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              totalPrice: Number(item.totalPrice),
              taxableUnitPrice: Number(item.taxableUnitPrice),
              taxableTotalPrice: Number(item.taxableTotalPrice),
            }))
          }
        },
        include: {
          quotationItems: true
        }
      });
    });

    res.json(mapToMongoose(updatedQuotation));
  } catch (error: any) {
    logger.error('Error updating quotation', { error: error.message, stack: error.stack });
    res.status(400).json({ error: error.message || 'Error updating quotation' });
  }
};
