import { Request, Response } from 'express';
import Product from '../models/Product';
import ProductUnit from '../models/ProductUnit';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const getInventory = async (req: Request, res: Response) => {
  try {
    const products = await Product.find().populate('categoryId');
    
    const stockCounts = await ProductUnit.aggregate([
      { $match: { status: 'IN_STOCK' } },
      { $group: { _id: '$productId', count: { $sum: 1 } } }
    ]);
    
    const stockMap = new Map();
    stockCounts.forEach(item => {
      stockMap.set(item._id.toString(), item.count);
    });

    const inventoryData = products.map(product => ({
      _id: product._id,
      productId: product,
      quantity: stockMap.get(product._id.toString()) || 0,
      updatedAt: product.updatedAt 
    }));

    res.json(inventoryData);
  } catch (error: any) {
    logger.error('Error fetching inventory', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const stockIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, purchaseInvoiceNumber, supplierName, serialNumbers, purchasePrice } = req.body;
    
    if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) {
      res.status(400).json({ error: 'serialNumbers array is required' });
      return;
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const units = serialNumbers.map((serialNumber: string) => ({
        productId,
        serialNumber,
        status: 'IN_STOCK',
        purchaseInvoiceNumber,
        supplierName,
        purchasePrice,
      }));

      await ProductUnit.insertMany(units, { session });
      await session.commitTransaction();
      session.endSession();

      logger.info('Stock added successfully', { productId, unitCount: units.length });
      res.status(201).json({ message: 'Stock added successfully' });
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      if (error.code === 11000) {
         res.status(400).json({ error: 'One or more serial numbers already exist' });
      } else {
         throw error;
      }
    }
  } catch (error: any) {
    logger.error('Error stocking in', { productId: req.body.productId, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const stockOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, serialNumbers } = req.body;

    if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) {
      res.status(400).json({ error: 'serialNumbers array is required' });
      return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = await ProductUnit.updateMany(
        { productId, serialNumber: { $in: serialNumbers }, status: 'IN_STOCK' },
        { $set: { status: 'DEFECTIVE' } }, // Use DEFECTIVE or another status for manual stock out
        { session }
      );

      if (result.modifiedCount !== serialNumbers.length) {
        throw new Error('Some serial numbers were not found or are not in stock');
      }

      await session.commitTransaction();
      session.endSession();

      logger.info('Stock removed successfully', { productId, removedCount: serialNumbers.length });
      res.json({ message: 'Stock removed successfully' });
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: error.message });
    }
  } catch (error: any) {
    logger.error('Error stocking out', { productId: req.body.productId, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const getSerials = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { status } = req.query; // optional filter

    const query: any = { productId };
    if (status) {
      query.status = status;
    }

    const serials = await ProductUnit.find(query).sort({ createdAt: -1 });
    res.json(serials);
  } catch (error: any) {
    logger.error('Error fetching serials', { productId: req.params.productId, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const searchSerials = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Query parameter q is required' });
      return;
    }

    const serials = await ProductUnit.find({
      serialNumber: { $regex: q, $options: 'i' }
    }).populate('productId').populate('saleId');

    res.json(serials);
  } catch (error: any) {
    logger.error('Error searching serials', { query: req.query.q, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};
