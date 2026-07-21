import type { StatusMap } from '@/components/ui/status-badge';

export type OnboardingTemplateRow = {
  id: string;
  name?: string;
  type?: string;
  isDefault?: boolean;
  itemCount?: number;
  createdAt?: string;
};
