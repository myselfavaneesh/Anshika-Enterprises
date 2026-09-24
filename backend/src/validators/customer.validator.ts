import { z } from 'zod';

export const CustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(255),
  phone: z.string().max(20).optional().nullable(),
  email: z.preprocess((val) => (val === '' ? null : val), z.string().email().max(255).optional().nullable()),
  address: z.string().max(500).optional().nullable(),
  gstNumber: z.string().max(20).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  stateCode: z.string().max(10).optional().nullable(),
  group: z.string().max(50).optional().nullable(),
  creditLimit: z.number().min(0).optional().nullable(),
  outstandingBalance: z.number().optional().nullable(),
});

export type CustomerInput = z.infer<typeof CustomerSchema>;
