'use client';

import { cn } from '@/lib/utils';
import type { TrendDirection } from './types';

interface TrendIndicatorProps {
  direction: TrendDirection;
  value: string;
  className?: string;
}

const styles: Record<TrendDirection, string> = {
  up: 'text-green-600',
  down: 'text-red-600',
  neutral: 'text-muted-foreground',
};

const arrows: Record<TrendDirection, string> = {
  up: '↑',
  down: '↓',
  neutral: '→',
};

/**
 * Inline trend indicator — shows direction + delta value.
 */
export function TrendIndicator({ direction, value, className }: TrendIndicatorProps) {
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', styles[direction], className)}>
      {arrows[direction]} {value}
    </span>
  );
}
