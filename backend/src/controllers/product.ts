import { Request, Response } from 'express';
import Product from '../models/Product';
import Inventory from '../models/Inventory';
import ProductUnit from '../models/ProductUnit';
import { logger } from '../utils/logger';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.find().populate('categoryId');
    res.json(products);
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

    // Initialize inventory for this product
    const inventory = new Inventory({ productId: product._id, quantity: 0 });
    await inventory.save();

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
    // Delete associated inventory
    await Inventory.findOneAndDelete({ productId: id });
    res.json({ message: 'Product deleted' });
  } catch (error: any) {
    logger.error('Error deleting product', { productId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};
