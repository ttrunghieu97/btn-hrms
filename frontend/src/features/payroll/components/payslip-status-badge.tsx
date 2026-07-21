import { Badge } from '@/components/ui/badge';
import { PAYSLIP_STATUS_OPTIONS, PAYSLIP_STATUS_BADGE_COLORS } from '../schemas/payslip-schema';

const statusLabel = (value: string): string => {
  const found = PAYSLIP_STATUS_OPTIONS.find((opt) => opt.value === value);
  return found?.label ?? value;
};

interface Props {
  status: string;
}

export function PayslipStatusBadge({ status }: Props) {
  return (
    <Badge variant={PAYSLIP_STATUS_BADGE_COLORS[status] ?? 'secondary'}>
      {statusLabel(status)}
    </Badge>
  );
}
