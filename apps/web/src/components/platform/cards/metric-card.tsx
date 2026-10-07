'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: { direction: 'up' | 'down'; percentage: number };
  icon?: React.ReactNode;
  subtitle?: string;
  className?: string;
}

export function MetricCard({ title, value, trend, icon, subtitle, className }: MetricCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">{title}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
            {trend && (
              <p className={cn(
                'text-xs mt-1 flex items-center gap-1',
                trend.direction === 'up' ? 'text-green-600' : 'text-red-600',
              )}>
                {trend.direction === 'up' ? '↑' : '↓'} {trend.percentage}%
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className="text-muted-foreground/40">{icon}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
