'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

export interface WorkflowTaskCardProps {
  title: string;
  count: number;
  description?: string;
  href: string;
  priority?: 'high' | 'medium' | 'low';
  icon?: React.ReactNode;
  actionLabel?: string;
  className?: string;
}

export function WorkflowTaskCard({
  title,
  count,
  description,
  href,
  priority = 'medium',
  icon,
  actionLabel = 'Xử lý ngay',
  className,
}: WorkflowTaskCardProps) {
  const priorityBadge = {
    high: { label: 'Ưu tiên cao', variant: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30' },
    medium: { label: 'Cần xử lý', variant: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' },
    low: { label: 'Theo dõi', variant: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  }[priority];

  return (
    <Card
      className={cn(
        'group border border-border bg-card shadow-xs transition-all hover:border-primary/40 hover:shadow-sm',
        className
      )}
    >
      <CardContent className='p-3.5 space-y-2.5 text-xs'>
        <div className='flex items-start justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <div className='flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
              {icon || <Icons.check className='size-3.5' />}
            </div>
            <span className='font-bold text-foreground text-sm leading-tight'>{title}</span>
          </div>

          <div className='flex items-center gap-1.5'>
            <span className='rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground'>
              {count}
            </span>
            <Badge variant='outline' className={cn('text-[10px] font-semibold', priorityBadge.variant)}>
              {priorityBadge.label}
            </Badge>
          </div>
        </div>

        {description && (
          <p className='text-muted-foreground text-[11px] leading-relaxed'>{description}</p>
        )}

        <div className='flex justify-end pt-1 border-t border-border/40'>
          <Link
            href={href}
            className='inline-flex items-center gap-1 font-semibold text-xs text-primary transition-colors group-hover:underline'
          >
            <span>{actionLabel}</span>
            <Icons.chevronRight className='size-3.5 transition-transform group-hover:translate-x-0.5' />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
