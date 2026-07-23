'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { TrendIndicator } from './trend-indicator';
import type { InsightData } from './types';

interface InsightCardProps {
  insight: InsightData;
  className?: string;
}

/**
 * Intelligence insight card — shows a key metric with trend.
 * Lighter weight than MetricCard; designed for insight grids.
 */
export function InsightCard({ insight, className }: InsightCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground truncate">{insight.title}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-semibold tracking-tight">{insight.value}</span>
          {insight.trend && (
            <TrendIndicator
              direction={insight.trend.direction}
              value={insight.trend.value}
            />
          )}
        </div>
        {insight.description && (
          <p className="text-xs text-muted-foreground/70 mt-1">{insight.description}</p>
        )}
      </CardContent>
    </Card>
  );
}
