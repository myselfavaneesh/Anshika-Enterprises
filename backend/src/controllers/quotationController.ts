import { Request, Response } from 'express';
import Quotation from '../models/Quotation';
import QuotationItem from '../models/QuotationItem';
import Customer from '../models/Customer';
import { logger } from '../utils/logger';

const generateQuotationNumber = async (): Promise<string> => {
  const count = await Quotation.countDocuments();
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const nextYear = (date.getFullYear() + 1).toString().slice(-2);
  const formattedCount = (count + 1).toString().padStart(4, '0');
  return `QT/${year}-${nextYear}/${formattedCount}`;
};

export const createQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, items, subtotal, discount, taxableAmount, taxRate, taxAmount, cgstAmount, sgstAmount, grandTotal, validUntil } = req.body;

    const quotationNumber = await generateQuotationNumber();

    const quotation = new Quotation({
      quotationNumber,
      customerId,
      subtotal,
      discount,
      taxableAmount,
      taxRate,
      taxAmount,
      cgstAmount,
      sgstAmount,
      grandTotal,
      validUntil,
      status: 'DRAFT',
    });

    await quotation.save();

    const quotationItems = items.map((item: any) => ({
      quotationId: quotation._id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      taxableUnitPrice: item.taxableUnitPrice,
      taxableTotalPrice: item.taxableTotalPrice,
    }));

    await QuotationItem.insertMany(quotationItems);

    res.status(201).json(quotation);
  } catch (error: any) {
    logger.error('Error creating quotation', { error: error.message });
    res.status(400).json({ error: error.message || 'Error creating quotation' });
  }
};

export const getQuotations = async (req: Request, res: Response): Promise<void> => {
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
        { quotationNumber: { $regex: search, $options: 'i' } },
        { customerId: { $in: customerIds } }
      ];
    }

    const total = await Quotation.countDocuments(query);
    const quotations = await Quotation.find(query)
      .populate('customerId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      data: quotations,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching quotations', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const getQuotationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const quotation = await Quotation.findById(id).populate('customerId').lean();
    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    const items = await QuotationItem.find({ quotationId: id }).populate('productId').lean();

    res.json({ ...quotation, items });
  } catch (error: any) {
    logger.error('Error fetching quotation details', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};
