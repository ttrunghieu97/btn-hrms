import { z } from 'zod';

export const PERIOD_STATUS_OPTIONS = [
  { value: 'draft', label: 'Nháp' },
  { value: 'open', label: 'Đang mở' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'closed', label: 'Đã đóng' },
  { value: 'paid', label: 'Đã trả' },
] as const;

export const PERIOD_STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  open: 'default',
  processing: 'default',
  closed: 'outline',
  paid: 'default',
};

export const createPayrollPeriodSchema = z.object({
  code: z.string().min(1, 'Vui lòng nhập mã kỳ lương'),
  name: z.string().min(1, 'Vui lòng nhập tên kỳ lương'),
  startsOn: z.string().min(1, 'Vui lòng chọn ngày bắt đầu').regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng YYYY-MM-DD'),
  endsOn: z.string().min(1, 'Vui lòng chọn ngày kết thúc').regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng YYYY-MM-DD'),
  payDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng YYYY-MM-DD').or(z.literal('')),
});

export type CreatePayrollPeriodFormValues = z.infer<typeof createPayrollPeriodSchema>;
