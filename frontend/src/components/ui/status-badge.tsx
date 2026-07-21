import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface StatusConfig {
  label: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

export type StatusMap = Record<string, StatusConfig>;

const DEFAULT_FALLBACK: StatusConfig = {
  label: 'Unknown',
  variant: 'outline',
};

interface StatusBadgeProps {
  status: string | null | undefined;
  mapping: StatusMap;
  fallback?: StatusConfig;
  className?: string;
}

export function StatusBadge({
  status,
  mapping,
  fallback = DEFAULT_FALLBACK,
  className,
}: StatusBadgeProps) {
  const config = status ? mapping[status] : undefined;
  const { label, variant, className: statusClassName } = config ?? fallback;

  return (
    <Badge variant={variant ?? 'outline'} className={cn(statusClassName, className)}>
      {label}
    </Badge>
  );
}
