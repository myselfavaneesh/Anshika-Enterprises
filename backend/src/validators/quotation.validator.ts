import { z } from 'zod';

export const QuotationItemSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  quantity: z.number().min(1, 'quantity must be at least 1'),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
  taxableUnitPrice: z.number().min(0),
  taxableTotalPrice: z.number().min(0),
  gstRate: z.number().min(0).default(0),
  cgstAmount: z.number().min(0).default(0),
  sgstAmount: z.number().min(0).default(0),
  wattage: z.number().min(0).default(0),
  comboGroupId: z.string().optional().nullable(),
});

export const QuotationComboGroupSchema = z.object({
  internalId: z.string().min(1),
  name: z.string().min(1),
  totalPrice: z.number().min(0),
  isGstInclusive: z.boolean().default(true),
});

export const QuotationServiceSchema = z.object({
  name: z.string().min(1, 'service name is required'),
  amount: z.number().min(0),
  gstRate: z.number().min(0).default(0),
  cgstAmount: z.number().min(0).default(0),
  sgstAmount: z.number().min(0).default(0),
  taxableAmount: z.number().min(0).default(0),
  isGstInclusive: z.boolean().default(true),
});

export const CreateQuotationSchema = z.object({
  customerId: z.string().min(1, 'customerId is required'),
  invoiceType: z.enum(['GST', 'NON_GST']).default('GST'),
  items: z.array(QuotationItemSchema).min(1, 'At least one item is required in a quotation'),
  services: z.array(QuotationServiceSchema).optional().default([]),
  comboGroups: z.array(QuotationComboGroupSchema).optional().default([]),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  taxableAmount: z.number().min(0),
  taxRate: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  cgstAmount: z.number().min(0).default(0),
  sgstAmount: z.number().min(0).default(0),
  grandTotal: z.number().min(0),
  validUntil: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED']).optional().default('DRAFT'),
});

export type CreateQuotationInput = z.infer<typeof CreateQuotationSchema>;
