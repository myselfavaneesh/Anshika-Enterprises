import { Request, Response } from 'express';
import Sale from '../models/Sale';
import SaleItem from '../models/SaleItem';
import ProductUnit from '../models/ProductUnit';
import Customer from '../models/Customer';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const createSale = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerId, items, subtotal, discount, taxableAmount, taxRate, taxAmount, cgstAmount, sgstAmount, grandTotal } = req.body;

    const invoiceNumber = `INV-${Date.now()}`;

    const sale = new Sale({
      invoiceNumber,
      customerId,
      subtotal,
      discount,
      taxableAmount,
      taxRate,
      taxAmount,
      cgstAmount,
      sgstAmount,
      grandTotal,
    });

    await sale.save({ session });

    for (const item of items) {
      if (!item.serialNumbers || item.serialNumbers.length !== item.quantity) {
        throw new Error(`Please provide exactly ${item.quantity} serial numbers for product ID: ${item.productId}`);
      }

      const saleItem = new SaleItem({
        saleId: sale._id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        taxableUnitPrice: item.taxableUnitPrice,
        taxableTotalPrice: item.taxableTotalPrice,
        serialNumbers: item.serialNumbers,
      });
      await saleItem.save({ session });

      // Update ProductUnits
      const result = await ProductUnit.updateMany(
        { productId: item.productId, serialNumber: { $in: item.serialNumbers }, status: 'IN_STOCK' },
        { $set: { status: 'SOLD', saleId: sale._id, saleItemId: saleItem._id } },
        { session }
      );

      if (result.modifiedCount !== item.serialNumbers.length) {
        throw new Error(`One or more serial numbers are not available for product ID: ${item.productId}`);
      }
    }



    await session.commitTransaction();
    session.endSession();

    logger.info('Sale completed', { saleId: sale._id, invoiceNumber });
    res.status(201).json(sale);
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    logger.error('Error processing sale', { error: error.message, stack: error.stack });
    res.status(400).json({ error: error.message || 'Error processing sale' });
  }
};

export const getSales = async (req: Request, res: Response) => {
  try {
    const sales = await Sale.find().populate('customerId').sort({ createdAt: -1 });
    res.json(sales);
  } catch (error: any) {
    logger.error('Error fetching sales', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const downloadInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const sale = await Sale.findById(id);
    if (!sale) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }

    const items = await SaleItem.find({ saleId: id }).populate('productId');
    const customer = await Customer.findById(sale.customerId);

    const pdfBuffer = await generateInvoicePDF(sale, items, customer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${sale.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    logger.error('Error generating invoice PDF', { saleId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Error generating invoice PDF' });
  }
};
