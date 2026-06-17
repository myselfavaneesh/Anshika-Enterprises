import { Request, Response } from 'express';
import Product from '../models/Product';
import ProductUnit from '../models/ProductUnit';
import { logger } from '../utils/logger';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const sort = (req.query.sort as string) || 'createdAt';
    const order = (req.query.order as string) === 'desc' ? -1 : 1;

    const categoryId = req.query.categoryId as string;
    const search = req.query.q as string;

    const query: any = {};

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('categoryId')
      .sort({ [sort]: order })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      data: products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching products', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId, name, sku, lowStockThreshold } = req.body;
    
    const existingSku = await Product.findOne({ sku });
    if (existingSku) {
      res.status(400).json({ error: 'SKU already exists' });
      return;
    }

    const product = new Product({ categoryId, name, sku, lowStockThreshold });
    await product.save();

    logger.info('Product created successfully', { productId: product._id, name, sku });
    res.status(201).json(product);
  } catch (error: any) {
    logger.error('Error creating product', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const product = await Product.findByIdAndUpdate(id, updates, { new: true });
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    
    logger.info('Product updated successfully', { productId: id });
    res.json(product);
  } catch (error: any) {
    logger.error('Error updating product', { productId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const unitCount = await ProductUnit.countDocuments({ productId: id });
    if (unitCount > 0) {
      res.status(400).json({ error: 'Cannot delete product because it has inventory or sales history.' });
      return;
    }

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    
    logger.info('Product deleted successfully', { productId: id });
    res.json({ message: 'Product deleted' });
  } catch (error: any) {
    logger.error('Error deleting product', { productId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};
