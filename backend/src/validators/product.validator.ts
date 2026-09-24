import { z } from 'zod';

export const ProductSchema = z.object({
  categoryId: z.string().min(1, 'categoryId is required'),
  name: z.string().min(1, 'Product name is required').max(255),
  sku: z.string().min(1, 'SKU is required').max(50),
  lowStockThreshold: z.number().int().min(0).default(5),
  hsnCode: z.string().max(20).optional().nullable(),
  unit: z.string().max(10).default('PC'),
  gstRate: z.number().min(0).max(100).default(0),
  purchasePrice: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
  isGstInclusive: z.boolean().default(true),
  wattage: z.number().min(0).default(0),
  trackSerials: z.boolean().default(true),
});

export const StockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  warehouseId: z.string().min(1, 'warehouseId is required'),
  type: z.enum(['IN', 'OUT']),
  quantity: z.number().int().positive('quantity must be positive'),
  notes: z.string().max(500).optional().nullable(),
  serialNumbers: z.array(z.string()).optional(),
});

export type ProductInput = z.infer<typeof ProductSchema>;
export type StockAdjustmentInput = z.infer<typeof StockAdjustmentSchema>;
