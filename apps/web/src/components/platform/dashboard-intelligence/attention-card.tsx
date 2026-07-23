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
  critical: { dot: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-950/10' },
  warning: { dot: 'bg-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/10' },
  info: { dot: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/10' },
  success: { dot: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-950/10' },
};

/**
 * Attention card — highlights items needing user action.
 * Shown prominently at the top of role dashboards.
 */
export function AttentionCard({ items, className, title = 'Needs Attention' }: AttentionCardProps) {
  if (items.length === 0) {
    return (
      <Card className={cn('border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/10', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">All clear — no items need attention</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-yellow-200 dark:border-yellow-800', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
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
