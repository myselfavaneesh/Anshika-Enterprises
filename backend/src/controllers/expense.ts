import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { logger } from '../utils/logger';

// --- Expense Categories ---

const CategorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

export const getExpenseCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.expenseCategory.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error: any) {
    logger.error('Error fetching expense categories', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const createExpenseCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = CategorySchema.parse(req.body);
    const exists = await prisma.expenseCategory.findUnique({ where: { name: parsed.name } });
    if (exists) {
      res.status(400).json({ error: 'Expense category already exists' });
      return;
    }
    const category = await prisma.expenseCategory.create({ data: parsed });
    res.status(201).json(category);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.issues });
      return;
    }
    logger.error('Error creating expense category', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateExpenseCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = CategorySchema.parse(req.body);
    const category = await prisma.expenseCategory.update({
      where: { id },
      data: parsed
    });
    res.json(category);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteExpenseCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const count = await prisma.expense.count({ where: { categoryId: id } });
    if (count > 0) {
      res.status(400).json({ error: 'Cannot delete category because it has expenses linked to it.' });
      return;
    }
    await prisma.expenseCategory.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: 'Server error' });
  }
};


// --- Expenses ---

const ExpenseSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  date: z.string().datetime(),
  paymentMode: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const getExpenses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, categoryId } = req.query;
    const where: any = {};
    
    if (startDate && endDate) {
      where.date = { gte: new Date(startDate as string), lte: new Date(endDate as string) };
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' }
    });
    res.json(expenses);
  } catch (error: any) {
    logger.error('Error fetching expenses', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const createExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = ExpenseSchema.parse(req.body);
    const expense = await prisma.expense.create({
      data: {
        ...parsed,
        date: new Date(parsed.date)
      },
      include: { category: true }
    });
    res.status(201).json(expense);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.issues });
      return;
    }
    logger.error('Error creating expense', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = ExpenseSchema.parse(req.body);
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...parsed,
        date: new Date(parsed.date)
      },
      include: { category: true }
    });
    res.json(expense);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }
    logger.error('Error updating expense', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.expense.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: 'Server error' });
  }
};
