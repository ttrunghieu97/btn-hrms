'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import { monitoringCopy } from '@/locales/vi';
import { useSystemHealthQuery } from '../queries/monitoring-queries';

const statusConfig = monitoringCopy.systemHealth.statusConfig as Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary'; icon: keyof typeof Icons }>;
const componentMeta = monitoringCopy.systemHealth.componentMeta as Record<string, { label: string; icon: keyof typeof Icons; desc: string }>;

type HealthComponent = {
  name: string;
  status: string;
  latencyMs: number;
  error?: string | null;
};

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function SystemHealthCard() {
  const { data, isLoading, error, isRefetching, refetch } = useSystemHealthQuery();

  if (isLoading) return <SystemHealthSkeleton />;
  if (error || !data) return <SystemHealthError onRetry={() => refetch()} />;

  const overall = statusConfig[data.overallStatus] ?? statusConfig.down;
  const OverallIcon = Icons[overall.icon];
  const components = data.components as HealthComponent[];
  const healthyCount = components.filter((component) => component.status === 'healthy').length;

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='rounded-lg border bg-card p-2.5'>
            <OverallIcon className='h-5 w-5 text-foreground' />
          </div>
          <div>
            <h3 className='text-sm font-medium'>{monitoringCopy.systemHealth.overview}</h3>
            <p className='text-xs text-muted-foreground'>
              {monitoringCopy.systemHealth.activeServices(healthyCount, components.length, formatLatency(data.totalLatencyMs))}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Badge variant={overall.variant} className='gap-1 px-3 py-1'>
            <OverallIcon className='h-3.5 w-3.5' />
            {overall.label}
          </Badge>
          <Button variant='outline' size='icon' className='h-8 w-8' onClick={() => refetch()} disabled={isRefetching}>
            <Icons.refresh className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {components.map((component) => {
          const cfg = statusConfig[component.status] ?? statusConfig.down;
          const meta = componentMeta[component.name] ?? { label: component.name, icon: 'database' as const, desc: '' };
          const Icon = Icons[meta.icon];
          const StatusIcon = Icons[cfg.icon];
          return (
            <Card key={component.name} className='relative overflow-hidden'>
              <div className={`absolute inset-x-0 top-0 h-1 ${component.status === 'healthy' ? 'bg-green-500' : component.status === 'degraded' ? 'bg-amber-500' : 'bg-destructive'}`} />
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <div className='flex items-center gap-2'>
                  <Icon className='h-4 w-4 text-muted-foreground' />
                  <div>
                    <CardTitle className='text-sm font-medium'>{meta.label}</CardTitle>
                    {meta.desc && <p className='text-[10px] text-muted-foreground'>{meta.desc}</p>}
                  </div>
                </div>
                <Badge variant={cfg.variant} className='gap-1 text-[10px]'>
                  <StatusIcon className='h-3 w-3' />
                  {cfg.label}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className='flex items-center justify-between text-xs text-muted-foreground'>
                  <span>{monitoringCopy.systemHealth.latency}</span>
                  <span className={component.latencyMs > 1000 ? 'text-amber-500 font-medium' : ''}>
                    {formatLatency(component.latencyMs)}
                  </span>
                </div>
                {component.error && (
                  <div className='mt-2 rounded bg-destructive/10 px-2 py-1 text-xs text-destructive'>
                    {component.error}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SystemHealthSkeleton() {
  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader><Skeleton className='h-5 w-48' /></CardHeader>
        <CardContent><Skeleton className='h-4 w-64' /></CardContent>
      </Card>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader><Skeleton className='h-4 w-24' /></CardHeader>
            <CardContent><Skeleton className='h-3 w-32' /></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SystemHealthError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className='flex flex-col items-center gap-4 py-8'>
        <Icons.circleX className='h-12 w-12 text-destructive' />
        <p className='text-sm text-muted-foreground'>{monitoringCopy.systemHealth.loadError}</p>
        <button onClick={onRetry} className='text-sm text-primary underline'>{monitoringCopy.systemHealth.retry}</button>
      </CardContent>
    </Card>
  );
}
