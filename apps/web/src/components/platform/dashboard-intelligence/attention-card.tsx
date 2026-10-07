'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AttentionItem, AttentionSeverity } from './types';

interface AttentionCardProps {
  items: AttentionItem[];
  className?: string;
  title?: string;
}

const severityConfig: Record<AttentionSeverity, { dot: string; bg: string }> = {
  critical: { dot: 'bg-destructive', bg: 'bg-destructive/10 text-destructive-foreground' },
  warning: { dot: 'bg-amber-500', bg: 'bg-amber-500/10 text-amber-900 dark:text-amber-200' },
  info: { dot: 'bg-sky-500', bg: 'bg-sky-500/10 text-sky-900 dark:text-sky-200' },
  success: { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200' },
};

/**
 * Attention card — highlights items needing user action.
 * Shown prominently at the top of role dashboards.
 */
export function AttentionCard({ items, className, title = 'Needs Attention' }: AttentionCardProps) {
  if (items.length === 0) {
    return (
      <Card className={cn('border-emerald-500/30 bg-emerald-500/5', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">All clear — no items need attention</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-border', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          {title}
          <span className="text-xs text-muted-foreground font-normal">({items.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const style = severityConfig[item.severity];
          return (
            <div key={item.id} className={cn('flex items-start gap-3 rounded-lg p-3', style.bg)}>
              <div className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', style.dot)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              </div>
              {item.action && (
                <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" asChild>
                  <Link href={item.action.href}>{item.action.label} →</Link>
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
