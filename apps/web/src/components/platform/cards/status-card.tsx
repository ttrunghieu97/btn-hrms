'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const variantStyles: Record<StatusVariant, { dot: string; bg: string }> = {
  success: { dot: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-950/20' },
  warning: { dot: 'bg-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
  error: { dot: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-950/20' },
  info: { dot: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20' },
  neutral: { dot: 'bg-gray-400', bg: 'bg-gray-50 dark:bg-gray-800/20' },
};

export interface StatusCardProps {
  title: string;
  value: string | number;
  variant?: StatusVariant;
  subtitle?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}

export function StatusCard({ title, value, variant = 'neutral', subtitle, className }: StatusCardProps) {
  const style = variantStyles[variant];
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', style.dot)} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">{title}</p>
            <p className="text-2xl font-semibold mt-0.5">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
