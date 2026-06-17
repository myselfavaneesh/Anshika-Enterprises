import { Request, Response } from 'express';
import Sale from '../models/Sale';
import SaleItem from '../models/SaleItem';
import ProductUnit from '../models/ProductUnit';
import Customer from '../models/Customer';
import { SaleService } from '../services/saleService';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { logger } from '../utils/logger';

export const createSale = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, items, subtotal, discount, taxableAmount, taxRate, taxAmount, cgstAmount, sgstAmount, grandTotal } = req.body;

    const sale = await SaleService.createSale({
      customerId,
      items,
      subtotal,
      discount,
      taxableAmount,
      taxRate,
      taxAmount,
      cgstAmount,
      sgstAmount,
      grandTotal,
    });

    res.status(201).json(sale);
  } catch (error: any) {
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
      // Find matching customers first
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

    // Fetch serial numbers dynamically from ProductUnit matching the saleItemId relationship (3NF compliant)
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
