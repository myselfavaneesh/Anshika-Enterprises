import { z } from 'zod';

export const SupplierSchema = z.object({
  name: z.string().trim().min(1, 'Supplier name is required').max(255),
  phone: z.preprocess((val) => {
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  }, z.string().max(20).optional().nullable()),
  email: z.preprocess((val) => {
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  }, z.string().email('Invalid email address format').max(255).optional().nullable()),
  address: z.preprocess((val) => {
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  }, z.string().max(500).optional().nullable()),
  gstNumber: z.preprocess((val) => {
    if (typeof val !== 'string') return val;
    const trimmed = val.trim().toUpperCase();
    return trimmed === '' ? null : trimmed;
  }, z.string().max(20).optional().nullable()),
  state: z.preprocess((val) => {
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  }, z.string().max(100).optional().nullable()),
  stateCode: z.preprocess((val) => {
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  }, z.string().max(10).optional().nullable()),
  group: z.preprocess((val) => {
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  }, z.string().max(50).optional().nullable()),
  creditLimit: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().nonnegative('Credit limit must be a non-negative number').optional().nullable()),
  outstandingBalance: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number().optional().nullable().default(0)),
});

export type SupplierInput = z.infer<typeof SupplierSchema>;

