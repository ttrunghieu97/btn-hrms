import { z } from 'zod';

export const createExpenseClaimSchema = z.object({
  title: z.string().min(1, 'Vui lòng nhập tiêu đề'),
  description: z.string().optional(),
  currency: z.string().default('VND'),
});

export type CreateExpenseClaimFormValues = z.infer<typeof createExpenseClaimSchema>;
