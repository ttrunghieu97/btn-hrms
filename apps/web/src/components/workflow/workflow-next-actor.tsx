'use client';

import * as React from 'react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { WorkflowActor } from '@/workflows/types';

export interface WorkflowNextActorProps {
  actor: string | WorkflowActor;
  guidance: string;
  resultPreview?: string;
  className?: string;
}

export function WorkflowNextActor({
  actor,
  guidance,
  resultPreview,
  className,
}: WorkflowNextActorProps) {
  const actorLabel = typeof actor === 'object' && actor !== null ? actor.label : actor;
  const actorDesc = typeof actor === 'object' && actor !== null ? actor.description : undefined;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-border/80 bg-muted/30 p-3.5 text-xs',
        className
      )}
    >
      <div className='flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5'>
        <Icons.activity className='size-3.5' />
      </div>
      <div className='flex-1 space-y-1'>
        <div className='flex items-center gap-2 font-medium text-foreground'>
          <span>Người xử lý tiếp theo:</span>
          <span className='rounded bg-primary/10 px-1.5 py-0.5 text-primary text-[11px] font-semibold'>
            {actorLabel}
          </span>
          {actorDesc && (
            <span className='text-[10px] text-muted-foreground hidden sm:inline'>
              ({actorDesc})
            </span>
          )}
        </div>
        <p className='text-muted-foreground leading-relaxed text-[11px]'>
          {guidance}
        </p>
        {resultPreview && (
          <p className='text-muted-foreground/90 text-[10px] italic'>
            → Kết quả sau khi thực hiện: {resultPreview}
          </p>
        )}
      </div>
    </div>
  );
}
