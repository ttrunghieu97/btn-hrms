'use client';

import * as React from 'react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

export interface WorkflowBlockingConditionsProps {
  conditions: string[];
  title?: string;
  className?: string;
}

export function WorkflowBlockingConditions({
  conditions,
  title = 'Điều kiện đang chặn quy trình (Blocking Conditions):',
  className,
}: WorkflowBlockingConditionsProps) {
  if (!conditions || conditions.length === 0) return null;

  return (
    <div
      className={cn(
        'rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs space-y-2',
        className
      )}
    >
      <div className='flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold'>
        <Icons.alertCircle className='size-4' />
        <span>{title}</span>
      </div>
      <ul className='space-y-1 text-muted-foreground text-[11px] list-disc list-inside'>
        {conditions.map((cond, idx) => (
          <li key={idx} className='text-foreground font-medium'>
            {cond}
          </li>
        ))}
      </ul>
      <p className='text-[10px] text-muted-foreground italic pt-1'>
        Vui lòng hoàn thành các điều kiện trên để mở khóa hành động tiếp theo.
      </p>
    </div>
  );
}
