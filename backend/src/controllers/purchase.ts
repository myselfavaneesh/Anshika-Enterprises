import { Request, Response } from 'express';
import { z } from 'zod';
import Purchase from '../models/Purchase';
import PurchaseItem from '../models/PurchaseItem';
import ProductUnit from '../models/ProductUnit';
import Supplier from '../models/Supplier';
import { PurchaseService } from '../services/purchaseService';
import { logger } from '../utils/logger';

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

    res.status(201).json(purchase);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
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

    const search = req.query.q as string;
    const status = req.query.status as string;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      const suppliers = await Supplier.find({
        name: { $regex: search, $options: 'i' }
      }).select('_id').lean();
      const supplierIds = suppliers.map(s => s._id);

      query.$or = [
        { purchaseInvoiceNumber: { $regex: search, $options: 'i' } },
        { supplierId: { $in: supplierIds } }
      ];
    }

    const total = await Purchase.countDocuments(query);
    const purchases = await Purchase.find(query)
      .populate('supplierId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      data: purchases,
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
    const purchase = await Purchase.findById(id).lean();
    if (!purchase) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }

    const rawItems = await PurchaseItem.find({ purchaseId: id }).populate('productId').lean();
    const supplier = await Supplier.findById(purchase.supplierId).lean();

    const items = await Promise.all(rawItems.map(async (item) => {
      const units = await ProductUnit.find({ purchaseItemId: item._id }).select('serialNumber').lean();
      return {
        ...item,
        serialNumbers: units.map(u => u.serialNumber)
      };
    }));

    res.json({
      ...purchase,
      supplierId: supplier,
      items: items
    });
  } catch (error: any) {
    logger.error('Error fetching purchase by id', { purchaseId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const deletePurchase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await PurchaseService.deletePurchase(id);
    res.json({ message: 'Purchase deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting purchase', { purchaseId: req.params.id, error: error.message });
    res.status(500).json({ error: error.message || 'Server error' });
  }
};
