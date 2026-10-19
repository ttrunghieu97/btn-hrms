import { z } from 'zod';

export const RUN_STATUS_OPTIONS = [
  { value: 'draft', label: 'Nháp' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'pending_approval', label: 'Chờ phê duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'posted', label: 'Đã hạch toán' },
  { value: 'cancelled', label: 'Đã hủy' },
] as const;

export const RUN_STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  processing: 'default',
  pending_approval: 'outline',
  approved: 'default',
  posted: 'default',
  cancelled: 'destructive',
};

export const createPayrollRunSchema = z.object({
  payrollPeriodId: z.string().min(1, 'Vui lòng chọn kỳ lương'),
  notes: z.string().or(z.literal('')),
});

export type CreatePayrollRunFormValues = z.infer<typeof createPayrollRunSchema>;
