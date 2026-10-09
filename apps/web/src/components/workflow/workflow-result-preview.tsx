'use client';

import * as React from 'react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

export interface WorkflowResultPreviewProps {
  title?: string;
  description: string;
  effects?: string[];
  className?: string;
}

export function WorkflowResultPreview({
  title = 'Sau khi thực hiện hành động này:',
  description,
  effects = [],
  className,
}: WorkflowResultPreviewProps) {
  if (!description && effects.length === 0) return null;

  return (
    <div
      className={cn(
        'rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-1.5',
        className
      )}
    >
      <div className='flex items-center gap-1.5 font-semibold text-primary text-[11px] uppercase tracking-wider'>
        <Icons.info className='size-3.5' />
        <span>{title}</span>
      </div>
      {description && (
        <p className='text-muted-foreground leading-relaxed text-xs'>
          {description}
        </p>
      )}
      {effects.length > 0 && (
        <ul className='list-disc list-inside space-y-0.5 text-muted-foreground text-[11px] pt-1'>
          {effects.map((effect, idx) => (
            <li key={idx}>{effect}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
