import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { PurchaseService } from '../services/purchaseService';
import { logger } from '../utils/logger';
import { mapToMongoose } from '../utils/mapper';

const PurchaseItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  taxableUnitPrice: z.number().min(0),
  taxableTotalPrice: z.number().min(0),
  serialNumbers: z.array(z.string()),
});

const PurchaseInputSchema = z.object({
  purchaseInvoiceNumber: z.string().min(1),
  supplierId: z.string(),
  items: z.array(PurchaseItemSchema).min(1),
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

export const createPurchase = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = PurchaseInputSchema.parse(req.body);

    const purchase = await PurchaseService.createPurchase(validatedData);

    res.status(201).json(mapToMongoose(purchase));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Duplicate serial number detected. One or more serial numbers already exist in the inventory.' });
      return;
    }
    logger.error('Error processing purchase', { error: error.message });
    res.status(400).json({ error: error.message || 'Error processing purchase' });
  }
};

export const getPurchases = async (req: Request, res: Response): Promise<void> => {
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
      const suppliers = await prisma.supplier.findMany({
        where: { name: { contains: search, mode: 'insensitive' } },
        select: { id: true }
      });
      const supplierIds = suppliers.map(s => s.id);

      where.OR = [
        { purchaseInvoiceNumber: { contains: search, mode: 'insensitive' } },
        { supplierId: { in: supplierIds } }
      ];
    }

    const total = await prisma.purchase.count({ where });
    const purchases = await prisma.purchase.findMany({
      where,
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const mappedPurchases = purchases.map(p => {
      const { supplier, ...rest } = p as any;
      return mapToMongoose({ ...rest, supplierId: supplier });
    });

    res.json({
      data: mappedPurchases,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching purchases', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const getPurchaseById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const purchase = await prisma.purchase.findUnique({ where: { id: id as string } });
    if (!purchase) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }

    const rawItems = await prisma.purchaseItem.findMany({
      where: { purchaseId: id as string },
      include: { product: true }
    });
    const supplier = await prisma.supplier.findUnique({ where: { id: purchase.supplierId } });

    const items = await Promise.all(rawItems.map(async (item) => {
      const units = await prisma.productUnit.findMany({
        where: { purchaseItemId: item.id },
        select: { serialNumber: true }
      });
      return {
        ...mapToMongoose(item),
        productId: mapToMongoose((item as any).product),
        serialNumbers: units.map(u => u.serialNumber)
      };
    }));

    res.json(mapToMongoose({
      ...purchase,
      supplierId: supplier ? mapToMongoose(supplier) : null,
      items: items
    }));
  } catch (error: any) {
    logger.error('Error fetching purchase by id', { purchaseId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const deletePurchase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await PurchaseService.deletePurchase(id as string);
    res.json({ message: 'Purchase deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting purchase', { purchaseId: req.params.id, error: error.message });
    res.status(500).json({ error: error.message || 'Server error' });
  }
};
