'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { Icons } from '@/components/icons';
import { Section } from '@/components/layout/section';
import { monitoringCopy } from '@/locales/vi';
import { useActivitiesQuery, useActivityActionsQuery, useActivityEntitiesQuery } from '../queries/monitoring-queries';

const actionLabels = monitoringCopy.activities.actionLabels as Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }>;

function getActionConfig(action: string) {
  return actionLabels[action] ?? { label: action, variant: 'outline' as const };
}

export function ActivityFeed() {
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterEntity, setFilterEntity] = useState<string>('');
  const { data, isLoading, error } = useActivitiesQuery({ page, limit: 20, action: filterAction || undefined, entity: filterEntity || undefined });
  const { data: actions } = useActivityActionsQuery();
  const { data: entities } = useActivityEntitiesQuery();

  if (isLoading) return <Section><ActivityFeedSkeleton /></Section>;
  if (error) return <Section><ActivityFeedError /></Section>;

  const activities = data?.activities ?? [];
  const pagination = data?.pagination;

  return (
    <Section>
      <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <Select value={filterAction} onValueChange={(v) => { setFilterAction(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className='w-[180px]'>
            <SelectValue placeholder={monitoringCopy.activities.allActions} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__all__'>{monitoringCopy.activities.allActions}</SelectItem>
            {actions?.map((a: string) => (
              <SelectItem key={a} value={a}>{actionLabels[a]?.label ?? a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEntity} onValueChange={(v) => { setFilterEntity(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className='w-[180px]'>
            <SelectValue placeholder={monitoringCopy.activities.allEntities} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__all__'>{monitoringCopy.activities.allEntities}</SelectItem>
            {entities?.map((e: string) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className='space-y-2'>
        {activities.length === 0 ? (
          <Card>
            <CardContent className='py-8'>
              <AppEmptyState
                icon={<Icons.activity className='size-8' />}
                title={monitoringCopy.activities.empty}
                compact
              />
            </CardContent>
          </Card>
        ) : (
          activities.map((activity) => {
            const cfg = getActionConfig(activity.action);
            return (
              <Card key={activity.id}>
                <CardContent className='flex items-start gap-4 py-3'>
                  <Icons.activity className='mt-0.5 h-4 w-4 text-muted-foreground' />
                  <div className='flex-1 space-y-1'>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm font-medium'>{activity.actorName ?? monitoringCopy.activities.systemActor}</span>
                      <Badge variant={cfg.variant} className='text-[10px]'>{cfg.label}</Badge>
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      {activity.entity}{activity.entityId ? ` #${activity.entityId.slice(0, 8)}` : ''}
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      {new Date(activity.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {pagination && pagination.total > pagination.limit && (
        <div className='flex items-center justify-between'>
          <Button
            variant='outline'
            size='sm'
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <Icons.chevronLeft className='mr-1 h-4 w-4' />
            {monitoringCopy.activities.previous}
          </Button>
          <span className='text-xs text-muted-foreground'>
            {monitoringCopy.activities.pageLabel(page, Math.ceil(pagination.total / pagination.limit))}
          </span>
          <Button
            variant='outline'
            size='sm'
            disabled={!pagination.hasNext}
            onClick={() => setPage((p) => p + 1)}
          >
            {monitoringCopy.activities.next}
            <Icons.chevronRight className='ml-1 h-4 w-4' />
          </Button>
        </div>
      )}
      </div>
    </Section>
  );
}

function ActivityFeedSkeleton() {
  return (
    <div className='space-y-2'>
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardContent className='flex items-start gap-4 py-3'>
            <Skeleton className='h-4 w-4 rounded-full' />
            <div className='flex-1 space-y-2'>
              <Skeleton className='h-4 w-48' />
              <Skeleton className='h-3 w-32' />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ActivityFeedError() {
  return (
    <Card>
      <CardContent className='flex flex-col items-center gap-4 py-8'>
        <Icons.circleX className='h-12 w-12 text-destructive' />
        <p className='text-sm text-muted-foreground'>{monitoringCopy.activities.loadError}</p>
      </CardContent>
    </Card>
  );
}
