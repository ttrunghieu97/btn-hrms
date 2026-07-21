import { Badge } from '@/components/ui/badge';
import { getEmployeeStatusLabel } from '../../utils/employee-status';
import type { SmartStatusKind } from '../../utils/employee-status';

const STATUS_COLORS: Record<string, string> = {
  probation:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  working:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  leave:
    'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
  suspended:
    'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300',
  retired:
    'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400',
  terminated:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
};

interface EmployeeStatusBadgeProps {
  status: string | null | undefined;
}

export function EmployeeStatusBadge({ status }: EmployeeStatusBadgeProps) {
  const colorClass = STATUS_COLORS[status ?? ''] ?? 'border-gray-200 bg-gray-50 text-gray-600';

  return (
    <Badge variant='outline' className={colorClass}>
      {getEmployeeStatusLabel(status)}
    </Badge>
  );
}
