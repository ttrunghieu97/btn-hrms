import { z } from 'zod';

export const PAY_FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Hàng tháng' },
  { value: 'semi_monthly', label: 'Nửa tháng' },
  { value: 'bi_weekly', label: 'Hai tuần' },
  { value: 'weekly', label: 'Hàng tuần' },
] as const;

export const salaryStructureSchema = z.object({
  employeeId: z.string().uuid('Vui lòng chọn nhân viên'),
  payFrequency: z.enum(['monthly', 'semi_monthly', 'bi_weekly', 'weekly']),
  baseSalary: z.string().min(1, 'Vui lòng nhập lương cơ bản'),
  currency: z.string(),
  effectiveFrom: z.string().min(1, 'Vui lòng chọn ngày hiệu lực').regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng YYYY-MM-DD'),
  effectiveTo: z.string(),
  isCurrent: z.boolean(),
});

export type SalaryStructureFormValues = z.infer<typeof salaryStructureSchema>;
