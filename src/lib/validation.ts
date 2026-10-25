import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email address, like name@business.com');
const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Enter a valid email address');
const phone = z
  .string()
  .trim()
  .refine((v) => v.replace(/\D/g, '').length >= 7, 'Enter a valid phone number');
const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === '' || v.replace(/\D/g, '').length >= 7, 'Enter a valid phone number');

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter your full name').max(120),
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Include at least one number'),
  acceptTerms: z.literal(true, { message: 'Accept the terms to continue' }),
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});

export const forgotSchema = z.object({ email });

export const businessSchema = z.object({
  name: z.string().trim().min(1, 'Enter your business name').max(120),
  category: z.enum(['laundry', 'salon', 'repair', 'services', 'retail', 'other']),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Choose a currency'),
  phone: optionalPhone,
  email: optionalEmail,
});

export const businessEditSchema = businessSchema.omit({ currency: true }).extend({
  address: z.string().trim().max(200),
  openingHours: z.string().trim().max(80),
});

export const customerSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter the customer’s name').max(120),
  phone,
  email: optionalEmail,
  address: z.string().trim().max(200),
  notes: z.string().trim().max(500),
});

export const inviteSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter their name'),
  email,
  role: z.enum(['manager', 'staff']),
});

export const expenseSchema = z.object({
  amountCents: z.number().int().positive('Enter the amount spent'),
  description: z.string().trim().min(1, 'Describe the expense').max(160),
});

/** Field errors keyed by field name, first message only. */
export function fieldErrors<T>(result: z.ZodSafeParseResult<T>): Partial<Record<string, string>> {
  if (result.success) return {};
  const out: Partial<Record<string, string>> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
