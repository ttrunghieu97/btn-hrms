import { z } from 'zod';
import { validationCopy } from '@/lib/feedback-copy';

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, validationCopy.auth.usernameRequired)
    .max(64, validationCopy.auth.usernameMax)
    .regex(/^[A-Za-z0-9._@-]+$/, validationCopy.auth.usernamePattern),
  password: z
    .string()
    .min(6, validationCopy.auth.passwordMin6)
    .max(128, validationCopy.auth.passwordMax128)
});

export type LoginInput = z.infer<typeof loginSchema>;
