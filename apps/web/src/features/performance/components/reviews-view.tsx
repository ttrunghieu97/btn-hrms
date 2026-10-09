'use client';

import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsString } from 'nuqs';
import { performanceReviewsQueryOptions, performanceCyclesQueryOptions } from '../api/queries';
import { extractList } from '@/lib/api-extract';
import { REVIEW_STATUS_MAP, type PerformanceReviewRow, type PerformanceCycleRow } from './status-maps';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDateVN } from "@/lib/date";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Icons } from '@/components/icons';
import { performanceUiCopy } from '@/locales/vi/app-copy';

const copy = performanceUiCopy.reviews;

export function PerformanceReviewsView() {
  const [params, setParams] = useQueryStates({ cycleId: parseAsString });

  const { data: cyclesData } = useQuery(performanceCyclesQueryOptions());
  const cycles = extractList<PerformanceCycleRow>(cyclesData);
  const selectedCycle = params.cycleId || cycles[0]?.id;

  const { data, error, isLoading, refetch } = useQuery({
    ...performanceReviewsQueryOptions(selectedCycle ?? ''),
    enabled: !!selectedCycle,
  });
  const rows = extractList<PerformanceReviewRow>(data);

  if (error && !isLoading) {
    return (
      <QueryErrorAlert error={error} subject={copy.title} onRetry={() => void refetch()} className='rounded-lg border-destructive/50 bg-destructive/5' />
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex items-center justify-end gap-4'>
        {cycles.length > 0 ? (
          <Select
            value={selectedCycle ?? ''}
            onValueChange={(val) => void setParams({ cycleId: val || null })}
          >
            <SelectTrigger className='w-64' aria-label='Chọn chu kỳ đánh giá'>
              <SelectValue placeholder='Chọn chu kỳ đánh giá' />
            </SelectTrigger>
            <SelectContent>
              {cycles.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {!selectedCycle ? (
        <AppEmptyState icon={<Icons.page className='size-10' />} title='Chưa có chu kỳ đánh giá' compact />
      ) : rows.length === 0 && !isLoading ? (
        <AppEmptyState icon={<Icons.page className='size-10' />} title={copy.empty} compact />
      ) : (
        <div className='rounded-md border overflow-hidden'>
          {/* Mobile cards view */}
          <div className='flex flex-col gap-3 p-3 md:hidden'>
            {rows.map((row) => (
              <Card key={row.id} className='p-4 space-y-2'>
                <div className='flex items-start justify-between gap-2'>
                  <span className='font-medium text-foreground text-sm'>{row.employeeName ?? '—'}</span>
                  <StatusBadge mapping={REVIEW_STATUS_MAP} status={row.status ?? 'pending'} />
                </div>
                <div className='grid grid-cols-2 gap-2 text-xs text-muted-foreground'>
                  <div>
                    <span className='font-medium text-foreground/80'>{copy.columns.reviewerName}: </span>
                    {row.reviewerName ?? '—'}
                  </div>
                  <div>
                    <span className='font-medium text-foreground/80'>{copy.columns.reviewType}: </span>
                    {row.reviewType ?? '—'}
                  </div>
                  <div className='col-span-2'>
                    <span className='font-medium text-foreground/80'>{copy.columns.dueDate}: </span>
                    {row.dueDate ? formatDateVN(row.dueDate) : '—'}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop table view */}
          <div className='hidden md:block overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.columns.employeeName}</TableHead>
                  <TableHead>{copy.columns.reviewerName}</TableHead>
                  <TableHead>{copy.columns.reviewType}</TableHead>
                  <TableHead>{copy.columns.status}</TableHead>
                  <TableHead>{copy.columns.dueDate}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className='font-medium'>{row.employeeName ?? '—'}</TableCell>
                    <TableCell>{row.reviewerName ?? '—'}</TableCell>
                    <TableCell>{row.reviewType ?? '—'}</TableCell>
                    <TableCell><StatusBadge mapping={REVIEW_STATUS_MAP} status={row.status ?? 'pending'} /></TableCell>
                    <TableCell>{row.dueDate ? formatDateVN(row.dueDate) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
