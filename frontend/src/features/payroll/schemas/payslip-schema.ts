import { z } from 'zod';

export const PAYSLIP_STATUS_OPTIONS = [
  { value: 'draft', label: 'Nháp' },
  { value: 'published', label: 'Đã công bố' },
  { value: 'acknowledged', label: 'Đã xác nhận' },
  { value: 'voided', label: 'Đã hủy' },
] as const;

export const PAYSLIP_STATUS_BADGE_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  acknowledged: 'default',
  voided: 'destructive',
};
