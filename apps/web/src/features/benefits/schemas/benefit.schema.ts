import { z } from 'zod';

const coverageTypeEnum = z.enum(['employee_only', 'employee_plus_one', 'family'] as const);

export const createBenefitPlanSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên gói phúc lợi'),
  description: z.string().optional(),
  providerId: z.string().uuid().optional().or(z.literal('')),
  coverageType: coverageTypeEnum,
  employerContribution: z.coerce.number().min(0).optional(),
  employeeContribution: z.coerce.number().min(0).optional(),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
  maxEligibleAge: z.coerce.number().min(0).optional(),
});

export type CreateBenefitPlanFormValues = z.infer<typeof createBenefitPlanSchema>;

export const enrollEmployeeSchema = z.object({
  planId: z.string().uuid('Vui lòng chọn gói phúc lợi'),
  employeeId: z.string().uuid('Vui lòng chọn nhân viên'),
  coverageType: coverageTypeEnum,
  effectiveFrom: z.string().optional(),
});

export type EnrollEmployeeFormValues = z.infer<typeof enrollEmployeeSchema>;
