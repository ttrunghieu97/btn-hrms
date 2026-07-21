import { Badge } from '@/components/ui/badge';
import { RUN_STATUS_OPTIONS, RUN_STATUS_COLORS } from '../schemas/payroll-run-schema';

const statusLabel = (value: string): string => {
  const found = RUN_STATUS_OPTIONS.find((opt) => opt.value === value);
  return found?.label ?? value;
};

interface Props {
  status: string;
}

export function PayrollRunStatusBadge({ status }: Props) {
  return (
    <Badge variant={RUN_STATUS_COLORS[status] ?? 'secondary'}>
      {statusLabel(status)}
    </Badge>
  );
}
