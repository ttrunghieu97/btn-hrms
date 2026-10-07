import { Badge } from '@/components/ui/badge';
import { getEmployeeStatusLabel } from '../../utils/employee-status';
import type { SmartStatusKind } from '../../utils/employee-status';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'neutral';

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  probation: 'info',
  working: 'success',
  leave: 'warning',
  suspended: 'warning',
  retired: 'neutral',
  terminated: 'destructive',
};

interface EmployeeStatusBadgeProps {
  status: string | null | undefined;
}

export function EmployeeStatusBadge({ status }: EmployeeStatusBadgeProps) {
  const variant = STATUS_VARIANTS[status ?? ''] ?? 'outline';

  return (
    <Badge variant={variant}>
      {getEmployeeStatusLabel(status)}
    </Badge>
  );
}
