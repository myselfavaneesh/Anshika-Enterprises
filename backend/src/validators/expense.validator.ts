import { z } from 'zod';

export const ExpenseCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(255),
  description: z.string().optional().nullable(),
});

export const ExpenseSchema = z.object({
  categoryId: z.string().min(1, 'categoryId is required'),
  amount: z.number().positive('amount must be greater than zero'),
  date: z.string().min(1, 'date is required'),
  paymentMode: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type ExpenseCategoryInput = z.infer<typeof ExpenseCategorySchema>;
export type ExpenseInput = z.infer<typeof ExpenseSchema>;
