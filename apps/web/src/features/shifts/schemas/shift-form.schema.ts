import { z } from 'zod';
import { validationCopy } from '@/lib/feedback-copy';

export const shiftDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, validationCopy.attendance.invalidDate);
export const shiftTimeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, validationCopy.attendance.invalidTime);

export const shiftTemplateFormSchema = z.object({
  code: z.string().trim().min(1, validationCopy.shift.codeRequired),
  name: z.string().trim().min(1, validationCopy.shift.nameRequired),
  startTime: shiftTimeSchema,
  endTime: shiftTimeSchema,
  activeWeekdays: z.array(z.string()).min(1, validationCopy.shift.activeWeekdaysRequired)
});

export const shiftAssignmentFormSchema = z.object({
  employeeId: z.string().trim().min(1, validationCopy.shift.employeeRequired),
  shiftTemplateId: z.string().trim().min(1, validationCopy.shift.templateRequired),
  effectiveFrom: shiftDateSchema,
  effectiveTo: z.union([shiftDateSchema, z.literal('')]).optional(),
  note: z.string().max(500, validationCopy.shift.noteMax).optional()
});

export const cancelShiftAssignmentFormSchema = z.object({
  cancelFrom: shiftDateSchema,
  reason: z.string().max(500, validationCopy.shift.reasonMax).optional()
});

export type ShiftTemplateFormValues = z.infer<typeof shiftTemplateFormSchema>;
export type ShiftAssignmentFormValues = z.infer<typeof shiftAssignmentFormSchema>;
export type CancelShiftAssignmentFormValues = z.infer<typeof cancelShiftAssignmentFormSchema>;
