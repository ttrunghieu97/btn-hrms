'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import { monitoringCopy } from '@/locales/vi';
import { useDataIntegrityQuery } from '../queries/monitoring-queries';

const severityConfig = monitoringCopy.dataIntegrity.severityConfig as Record<string, { label: string; variant: 'destructive' | 'secondary' | 'default' }>;
const domainLabels = monitoringCopy.dataIntegrity.domainLabels as Record<string, string>;

export function DataIntegrityPanel() {
  const { data, isLoading, error, isRefetching, refetch } = useDataIntegrityQuery();

  if (isLoading) return <DataIntegritySkeleton />;
  if (error || !data) return <DataIntegrityError onRetry={() => refetch()} />;

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-end'>
        <Button variant='outline' size='icon' className='h-8 w-8' onClick={() => refetch()} disabled={isRefetching}>
          <Icons.refresh className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className='grid grid-cols-3 gap-4'>
        <Card className='relative overflow-hidden'>
          <div className='absolute inset-x-0 top-0 h-1 bg-primary' />
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>{monitoringCopy.dataIntegrity.totalIssues}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold'>{data.totalIssues}</div>
          </CardContent>
        </Card>
        <Card className='relative overflow-hidden'>
          <div className={`absolute inset-x-0 top-0 h-1 ${data.criticalCount > 0 ? 'bg-destructive' : 'bg-green-500'}`} />
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>{monitoringCopy.dataIntegrity.critical}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${data.criticalCount > 0 ? 'text-destructive' : ''}`}>
              {data.criticalCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>{monitoringCopy.dataIntegrity.lastChecked}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-sm text-muted-foreground'>
              {new Date(data.checkedAt).toLocaleString('vi-VN')}
            </div>
          </CardContent>
        </Card>
      </div>

      {data.issues.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center gap-4 py-12'>
            <div className='rounded-full bg-green-500/10 p-4'>
              <Icons.circleCheck className='h-8 w-8 text-green-500' />
            </div>
            <p className='text-sm font-medium'>{monitoringCopy.dataIntegrity.noIssues}</p>
            <p className='text-xs text-muted-foreground'>{monitoringCopy.dataIntegrity.allValid}</p>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-3'>
          <p className='text-sm text-muted-foreground'>
            {monitoringCopy.dataIntegrity.issuesFound(data.totalIssues)}
          </p>
          {data.issues.map((issue, idx: number) => {
            const sev = severityConfig[issue.severity] ?? severityConfig.info;
            const SeverityIcon = sev.variant === 'destructive' ? Icons.circleX : sev.variant === 'secondary' ? Icons.warning : Icons.info;
            return (
              <Card key={idx} className='overflow-hidden'>
                <div className={`h-1 ${sev.variant === 'destructive' ? 'bg-destructive' : sev.variant === 'secondary' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                <CardContent className='flex items-start gap-4 py-4'>
                  <div className={`rounded-full p-2 ${
                    sev.variant === 'destructive' ? 'bg-destructive/10' : sev.variant === 'secondary' ? 'bg-amber-500/10' : 'bg-blue-500/10'
                  }`}>
                    <SeverityIcon className={`h-4 w-4 ${
                      sev.variant === 'destructive' ? 'text-destructive' : sev.variant === 'secondary' ? 'text-amber-500' : 'text-blue-500'
                    }`} />
                  </div>
                  <div className='flex-1 space-y-1'>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm font-medium'>{domainLabels[issue.domain] ?? issue.domain}</span>
                      <Badge variant={sev.variant}>{sev.label}</Badge>
                      <Badge variant='outline' className='text-[10px]'>{monitoringCopy.dataIntegrity.records(issue.count)}</Badge>
                    </div>
                    <p className='text-sm text-muted-foreground'>{issue.description}</p>
                    {issue.recommendation && (
                      <p className='mt-2 rounded bg-muted px-2 py-1 text-xs text-muted-foreground'>
                        <span className='font-medium'>{monitoringCopy.dataIntegrity.recommendation}</span> {issue.recommendation}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DataIntegritySkeleton() {
  return (
    <div className='space-y-6'>
      <div className='flex gap-4'>
        {[1, 2, 3].map((i) => (
          <Card key={i} className='flex-1'>
            <CardHeader><Skeleton className='h-4 w-24' /></CardHeader>
            <CardContent><Skeleton className='h-8 w-16' /></CardContent>
          </Card>
        ))}
      </div>
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardContent className='py-4'><Skeleton className='h-16 w-full' /></CardContent>
        </Card>
      ))}
    </div>
  );
}

function DataIntegrityError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className='flex flex-col items-center gap-4 py-8'>
        <Icons.circleX className='h-12 w-12 text-destructive' />
        <p className='text-sm text-muted-foreground'>{monitoringCopy.dataIntegrity.loadError}</p>
        <button onClick={onRetry} className='text-sm text-primary underline'>{monitoringCopy.dataIntegrity.retry}</button>
      </CardContent>
    </Card>
  );
}
