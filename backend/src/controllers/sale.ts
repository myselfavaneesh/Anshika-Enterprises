import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { SaleService } from '../services/saleService';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { logger } from '../utils/logger';
import { mapToMongoose } from '../utils/mapper';

const SaleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  taxableUnitPrice: z.number().min(0),
  taxableTotalPrice: z.number().min(0),
  serialNumbers: z.array(z.string()),
});

const SaleInputSchema = z.object({
  customerId: z.string(),
  items: z.array(SaleItemSchema).min(1),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  taxableAmount: z.number().min(0),
  taxRate: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  cgstAmount: z.number().min(0).default(0),
  sgstAmount: z.number().min(0).default(0),
  grandTotal: z.number().min(0),
  amountPaid: z.number().min(0).default(0),
  paymentMode: z.string().optional(),
});

export const createSale = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = SaleInputSchema.parse(req.body);

    const sale = await SaleService.createSale(validatedData);

    res.status(201).json(mapToMongoose(sale));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
      return;
    }
    logger.error('Error processing sale', { error: error.message });
    res.status(400).json({ error: error.message || 'Error processing sale' });
  }
};

export const getSales = async (req: Request, res: Response): Promise<void> => {
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
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customerId: { in: customerIds } }
      ];
    }

    const total = await prisma.sale.count({ where });
    const sales = await prisma.sale.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const mappedSales = sales.map(s => {
      const { customer, ...rest } = s as any;
      return mapToMongoose({ ...rest, customerId: customer });
    });

    res.json({
      data: mappedSales,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching sales', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const downloadInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findUnique({ where: { id: id as string } });
    if (!sale) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }

    const rawItems = await prisma.saleItem.findMany({
      where: { saleId: id as string },
      include: { product: true }
    });
    
    const customer = await prisma.customer.findUnique({ where: { id: sale.customerId } });

    const items = await Promise.all(rawItems.map(async (item) => {
      const units = await prisma.productUnit.findMany({
        where: { saleItemId: item.id },
        select: { serialNumber: true }
      });
      return {
        ...mapToMongoose(item),
        serialNumbers: units.map(u => u.serialNumber)
      };
    }));

    const pdfBuffer = await generateInvoicePDF(mapToMongoose(sale), items, mapToMongoose(customer));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${sale.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    logger.error('Error generating invoice PDF', { saleId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Error generating invoice PDF' });
  }
};

export const getSaleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findUnique({ where: { id: id as string } });
    if (!sale) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }

    const rawItems = await prisma.saleItem.findMany({
      where: { saleId: id as string },
      include: { product: true }
    });
    const customer = await prisma.customer.findUnique({ where: { id: sale.customerId } });

    const items = await Promise.all(rawItems.map(async (item) => {
      const units = await prisma.productUnit.findMany({
        where: { saleItemId: item.id },
        select: { serialNumber: true }
      });
      return {
        ...mapToMongoose(item),
        productId: mapToMongoose((item as any).product),
        serialNumbers: units.map(u => u.serialNumber)
      };
    }));

    res.json(mapToMongoose({
      ...sale,
      customerId: customer ? mapToMongoose(customer) : null,
      items: items
    }));
  } catch (error: any) {
    logger.error('Error fetching sale by id', { saleId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteSale = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await SaleService.deleteSale(id as string);
    res.json({ message: 'Sale deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting sale', { saleId: req.params.id, error: error.message });
    res.status(500).json({ error: error.message || 'Server error' });
  }
};
