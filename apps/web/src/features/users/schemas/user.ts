import * as z from 'zod';
import { userUiCopy } from '@/lib/app-copy';

export const userSchema = z.object({
  firstName: z.string().min(2, userUiCopy.validation.firstNameMin2),
  lastName: z.string().min(2, userUiCopy.validation.lastNameMin2),
  email: z.string().email(userUiCopy.validation.emailInvalid).optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal(''))
});

export type UserFormValues = z.infer<typeof userSchema>;
