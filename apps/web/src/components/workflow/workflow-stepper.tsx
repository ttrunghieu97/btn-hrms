'use client';

import * as React from 'react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { WorkflowState } from '@/workflows/types';

export interface WorkflowStepperStep {
  key: string;
  label: string;
  description?: string;
  actor?: string;
}

export interface WorkflowStepperProps {
  steps: Array<WorkflowStepperStep | WorkflowState>;
  currentIndex: number;
  failedIndex?: number;
  className?: string;
}

export function WorkflowStepper({
  steps,
  currentIndex,
  failedIndex,
  className,
}: WorkflowStepperProps) {
  return (
    <div className={cn('w-full space-y-2', className)}>
      <div
        className={cn(
          'grid gap-2',
          steps.length <= 4 && 'grid-cols-2 md:grid-cols-4',
          steps.length === 5 && 'grid-cols-2 md:grid-cols-5',
          steps.length > 5 && 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
        )}
      >
        {steps.map((step, idx) => {
          const isDone = idx < currentIndex && idx !== failedIndex;
          const isCurrent = idx === currentIndex && idx !== failedIndex;
          const isFailed = idx === failedIndex;

          return (
            <div
              key={step.key}
              className={cn(
                'flex flex-col gap-1 rounded-lg border p-2.5 text-xs transition-colors',
                isDone && 'border-emerald-500/40 bg-emerald-500/5 text-emerald-900 dark:text-emerald-300',
                isCurrent && !isFailed && 'border-primary bg-primary/5 font-semibold text-primary shadow-xs ring-1 ring-primary/20',
                isFailed && 'border-destructive/40 bg-destructive/5 text-destructive font-semibold',
                !isDone && !isCurrent && !isFailed && 'border-border/60 bg-muted/20 text-muted-foreground opacity-60'
              )}
            >
              <div className='flex items-center justify-between'>
                <span className='font-medium'>{step.label}</span>
                {isDone && <Icons.check className='size-3 text-emerald-600 dark:text-emerald-400' />}
                {isCurrent && !isFailed && (
                  <span className='size-2 rounded-full bg-primary animate-pulse' />
                )}
                {isFailed && <Icons.close className='size-3 text-destructive' />}
              </div>
              {step.description && (
                <span className='text-[10px] text-muted-foreground font-normal line-clamp-1'>
                  {step.description}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
