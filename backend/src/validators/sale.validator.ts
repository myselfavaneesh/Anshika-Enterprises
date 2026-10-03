import { z } from 'zod';

export const SaleItemSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  quantity: z.number().min(1, 'quantity must be at least 1'),
  unitPrice: z.number().min(0),
  taxableUnitPrice: z.number().min(0),
  taxableTotalPrice: z.number().min(0),
  totalPrice: z.number().min(0),
  gstRate: z.number().min(0).default(0),
  cgstAmount: z.number().min(0).default(0),
  sgstAmount: z.number().min(0).default(0),
  igstAmount: z.number().min(0).default(0),
  hsnCode: z.string().optional().nullable(),
  unit: z.string().optional(),
  wattage: z.number().min(0).default(0),
  serialNumbers: z.array(z.string()).optional(),
  comboGroupId: z.string().optional(),
});

export const SaleServiceSchema = z.object({
  name: z.string().min(1, 'service name is required'),
  amount: z.number().min(0),
  gstRate: z.number().min(0).default(0),
  cgstAmount: z.number().min(0).default(0),
  sgstAmount: z.number().min(0).default(0),
  taxableAmount: z.number().min(0).default(0),
  isGstInclusive: z.boolean().default(true),
});

export const SalePaymentSchema = z.object({
  paymentMode: z.string().min(1, 'paymentMode is required'),
  amount: z.number().min(0),
  referenceNumber: z.string().optional().nullable(),
  emiProvider: z.string().optional().nullable(),
  emiReferenceNumber: z.string().optional().nullable(),
});

export const SaleComboGroupSchema = z.object({
  internalId: z.string().min(1),
  name: z.string().min(1),
  totalPrice: z.number().min(0),
  isGstInclusive: z.boolean().default(true),
});

export const CreateSaleSchema = z.object({
  customerId: z.string().min(1, 'customerId is required'),
  invoiceType: z.enum(['GST', 'NON_GST', 'COMPOSITION']).default('COMPOSITION'),
  documentType: z.string().optional(),
  items: z.array(SaleItemSchema).min(1, 'At least one item is required in a sale'),
  services: z.array(SaleServiceSchema).optional(),
  comboGroups: z.array(SaleComboGroupSchema).optional(),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  taxableAmount: z.number().min(0),
  taxRate: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  cgstAmount: z.number().min(0).default(0),
  sgstAmount: z.number().min(0).default(0),
  igstAmount: z.number().min(0).default(0),
  roundOff: z.number().default(0),
  grandTotal: z.number().min(0),
  placeOfSupply: z.string().optional().nullable(),
  placeOfSupplyCode: z.string().optional().nullable(),
  payments: z.array(SalePaymentSchema).optional(),
  amountPaid: z.number().min(0).optional(),
  paymentMode: z.string().optional().nullable(),
  eInvoiceAckNo: z.string().optional().nullable(),
  eWayBillNo: z.string().optional().nullable(),
  customerSignatureUrl: z.string().optional().nullable(),
});

export type CreateSaleInput = z.infer<typeof CreateSaleSchema>;
