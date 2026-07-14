import { Request, Response } from 'express';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { mapToMongoose } from '../utils/mapper';

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(mapToMongoose(categories));
  } catch (error: any) {
    logger.error('Error fetching categories', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      res.status(400).json({ error: 'Category already exists' });
      return;
    }
    const category = await prisma.category.create({
      data: { name, description }
    });
    res.status(201).json(mapToMongoose(category));
  } catch (error: any) {
    logger.error('Error creating category', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    try {
      const category = await prisma.category.update({
        where: { id: id as string },
        data: { name, description }
      });
      res.json(mapToMongoose(category));
    } catch (e: any) {
      if (e.code === 'P2025') {
        res.status(404).json({ error: 'Category not found' });
      } else {
        throw e;
      }
    }
  } catch (error: any) {
    logger.error('Error updating category', { categoryId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if category is referenced by any product
    const count = await prisma.product.count({ where: { categoryId: id as string } });
    if (count > 0) {
      res.status(400).json({ error: 'Cannot delete category that is in use by products' });
      return;
    }

    try {
      await prisma.category.delete({ where: { id: id as string } });
      res.json({ message: 'Category deleted' });
    } catch (e: any) {
      if (e.code === 'P2025') {
        res.status(404).json({ error: 'Category not found' });
      } else {
        throw e;
      }
    }
  } catch (error: any) {
    logger.error('Error deleting category', { categoryId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};
