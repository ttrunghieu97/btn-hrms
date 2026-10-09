'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { WorkflowState } from '@/workflows/types';

export interface WorkflowStateBadgeProps {
  state?: string | WorkflowState;
  label?: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'amber' | 'emerald' | 'blue';
  className?: string;
  isPulsing?: boolean;
}

const VARIANT_STYLES: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300',
  amber: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300',
  blue: 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-300',
  destructive: 'bg-destructive/10 text-destructive border-destructive/30',
  outline: 'bg-muted/40 text-muted-foreground border-border',
  secondary: 'bg-secondary text-secondary-foreground',
  default: 'bg-primary/10 text-primary border-primary/30',
};

export function WorkflowStateBadge({
  state,
  label,
  variant,
  className,
  isPulsing = false,
}: WorkflowStateBadgeProps) {
  let displayLabel = label;
  let computedVariant = variant || 'default';

  if (typeof state === 'object' && state !== null) {
    displayLabel = displayLabel || state.label;
    computedVariant = variant || state.variant || 'default';
  } else if (typeof state === 'string') {
    displayLabel = displayLabel || state;
  }

  const colorClass = VARIANT_STYLES[computedVariant] || VARIANT_STYLES.default;

  return (
    <Badge
      variant='outline'
      className={cn(
        'font-medium text-xs px-2 py-0.5 inline-flex items-center gap-1.5 transition-colors',
        colorClass,
        className
      )}
    >
      {isPulsing && (
        <span className='size-1.5 rounded-full bg-current animate-pulse' />
      )}
      <span>{displayLabel || 'Chưa xác định'}</span>
    </Badge>
  );
}
