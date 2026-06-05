import { Request, Response } from 'express';
import Category from '../models/Category';
import Product from '../models/Product';
import { logger } from '../utils/logger';

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error: any) {
    logger.error('Error fetching categories', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    const existing = await Category.findOne({ name });
    if (existing) {
      res.status(400).json({ error: 'Category already exists' });
      return;
    }
    const category = new Category({ name, description });
    await category.save();
    res.status(201).json(category);
  } catch (error: any) {
    logger.error('Error creating category', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const category = await Category.findByIdAndUpdate(id, { name, description }, { new: true });
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.json(category);
  } catch (error: any) {
    logger.error('Error updating category', { categoryId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if category is referenced by any product
    const inUse = await Product.findOne({ categoryId: id });
    if (inUse) {
      res.status(400).json({ error: 'Cannot delete category that is in use by products' });
      return;
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.json({ message: 'Category deleted' });
  } catch (error: any) {
    logger.error('Error deleting category', { categoryId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};
