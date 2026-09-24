import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required').max(128),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(128),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
