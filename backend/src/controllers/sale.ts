import { Request, Response } from 'express';
import { z } from 'zod';
import Sale from '../models/Sale';
import SaleItem from '../models/SaleItem';
import ProductUnit from '../models/ProductUnit';
import Customer from '../models/Customer';
import { SaleService } from '../services/saleService';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { logger } from '../utils/logger';

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

    res.status(201).json(sale);
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

    const search = req.query.q as string;
    const status = req.query.status as string;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      const customers = await Customer.find({
        name: { $regex: search, $options: 'i' }
      }).select('_id').lean();
      const customerIds = customers.map(c => c._id);

      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { customerId: { $in: customerIds } }
      ];
    }

    const total = await Sale.countDocuments(query);
    const sales = await Sale.find(query)
      .populate('customerId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      data: sales,
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
    const sale = await Sale.findById(id).lean();
    if (!sale) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }

    const rawItems = await SaleItem.find({ saleId: id }).populate('productId').lean();
    const customer = await Customer.findById(sale.customerId).lean();

    const items = await Promise.all(rawItems.map(async (item) => {
      const units = await ProductUnit.find({ saleItemId: item._id }).select('serialNumber').lean();
      return {
        ...item,
        serialNumbers: units.map(u => u.serialNumber)
      };
    }));

    const pdfBuffer = await generateInvoicePDF(sale, items, customer);

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
    const sale = await Sale.findById(id).lean();
    if (!sale) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }

    const rawItems = await SaleItem.find({ saleId: id }).populate('productId').lean();
    const customer = await Customer.findById(sale.customerId).lean();

    const items = await Promise.all(rawItems.map(async (item) => {
      const units = await ProductUnit.find({ saleItemId: item._id }).select('serialNumber').lean();
      return {
        ...item,
        serialNumbers: units.map(u => u.serialNumber)
      };
    }));

    res.json({
      ...sale,
      customerId: customer,
      items: items
    });
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
