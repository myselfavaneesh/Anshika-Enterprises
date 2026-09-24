import { z } from 'zod';

export const PaymentSchema = z.object({
  entityType: z.enum(['CUSTOMER', 'SUPPLIER']),
  entityId: z.string().min(1, 'entityId is required'),
  type: z.enum(['MONEY_IN', 'MONEY_OUT']),
  amount: z.number().positive('amount must be greater than zero'),
  paymentMode: z.string().min(1, 'paymentMode is required').max(50),
  referenceId: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const BulkPaymentSchema = z.array(PaymentSchema).min(1, 'At least one payment must be provided');

export type PaymentInput = z.infer<typeof PaymentSchema>;
export type BulkPaymentInput = z.infer<typeof BulkPaymentSchema>;
