'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { parseAsArrayOf, parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { format, startOfWeek, addDays } from 'date-fns';
import type { ScheduleRow } from '@/features/schedule/api/queries';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDataTable } from '@/hooks/use-data-table';
import { commonUiCopy } from '@/lib/app-copy';
import { getSortingStateParser } from '@/lib/parsers';
import { shiftsRosterQueryOptions } from '@/features/shifts';
import { columns } from './columns';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { createTableSearchParams } from '@/lib/pagination';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';

const SCHEDULE_STATUS_TABS = [
  { value: 'all', label: 'Tất cả', icon: Icons.calendar },
  { value: 'published', label: 'Đã công bố', icon: Icons.check },
  { value: 'planned', label: 'Đã lên kế hoạch', icon: Icons.clock },
] as const;

type ScheduleTabValue = (typeof SCHEDULE_STATUS_TABS)[number]['value'];

const tempColumnIds = columns(() => {}).map((column) => column.id).filter(Boolean) as string[];

function toIsoDate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function ClearFiltersButton({ disabled }: { disabled?: boolean }) {
  const [, setParams] = useQueryStates({
    ...createTableSearchParams(tempColumnIds),
    search: parseAsString
  });

  return (
    <button
      type='button'
      className='text-primary underline-offset-2 hover:underline'
      disabled={disabled}
      onClick={() => {
        void setParams({ page: 1, search: null, sort: [] });
      }}
    >
      Xóa bộ lọc
    </button>
  );
}

export function ScheduleTable() {
  const router = useRouter();
  const [selectedRow, setSelectedRow] = React.useState<ScheduleRow | null>(null);
  const [weekStart, setWeekStart] = React.useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [params, setParams] = useQueryStates({
    ...createTableSearchParams(tempColumnIds),
    search: parseAsString,
    detail: parseAsString,
    tab: parseAsString,
  });

  const activeTab = params.tab ?? 'all';
  const resolvedActiveTab: ScheduleTabValue =
    SCHEDULE_STATUS_TABS.some((item) => item.value === activeTab)
      ? (activeTab as ScheduleTabValue)
      : 'all';

  const weekRange = React.useMemo(() => {
    return {
      from: toIsoDate(weekStart),
      to: toIsoDate(addDays(weekStart, 6))
    };
  }, [weekStart]);

  const { data, error, isLoading, refetch } = useQuery(
    shiftsRosterQueryOptions({ from: weekRange.from, to: weekRange.to })
  );

  /* ─── client-side filter + sort ─── */
  const processedRows = React.useMemo(() => {
    let rows = data?.rows ?? [];

    if (resolvedActiveTab === 'published') {
      rows = rows.filter((r) => r.assignmentStatus === 'published');
    } else if (resolvedActiveTab === 'planned') {
      rows = rows.filter((r) => r.assignmentStatus === 'planned');
    }

    if (params.search) {
      const term = params.search.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
      rows = rows.filter((r) =>
        r.employeeName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').includes(term) ||
        r.employeeId.toLowerCase().includes(term) ||
        (r.shiftTemplateName || '').toLowerCase().includes(term)
      );
    }

    if (params.sort?.length) {
      const s = params.sort[0];
      rows.sort((a, b) => {
        const aVal = String((a as any)[s.id] ?? '');
        const bVal = String((b as any)[s.id] ?? '');
        return s.desc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      });
    }

    return rows;
  }, [data, resolvedActiveTab, params.search, params.sort]);

  const pageCount = Math.max(1, Math.ceil(processedRows.length / params.perPage));
  const paginatedRows = React.useMemo(
    () => processedRows.slice((params.page - 1) * params.perPage, params.page * params.perPage),
    [processedRows, params.page, params.perPage]
  );

  const hasFilters = Boolean(params.search ?? (resolvedActiveTab !== 'all' ? true : false));

  /* ─── detail sheet ─── */
  const detailOpen = !!params.detail;
  React.useEffect(() => {
    if (params.detail && processedRows.length > 0) {
      const found = processedRows.find((r) => `${r.assignmentId}-${r.workDate}` === params.detail);
      if (found && found !== selectedRow) setSelectedRow(found);
    }
  }, [params.detail, processedRows, selectedRow]);

  const handleRowClick = React.useCallback((row: ScheduleRow) => {
    setSelectedRow(row);
    setParams({ detail: `${row.assignmentId}-${row.workDate}` }).catch(() => undefined);
  }, [setParams]);

  const cols = React.useMemo(() => columns(handleRowClick), [handleRowClick]);

  const { table } = useDataTable({
    data: paginatedRows,
    columns: cols,
    pageCount,
    shallow: true,
    debounceMs: 500,
    tableId: 'schedule'
  });

  /* ─── states ─── */
  if (error) {
    return (
      <QueryErrorAlert
        error={error}
        subject='lịch làm việc'
        onRetry={() => void refetch()}
        className='rounded-xl border-destructive/50 bg-destructive/5'
      />
    );
  }

  if (isLoading || !data) {
    return <ScheduleTableSkeleton />;
  }

  const emptyState = !processedRows.length ? (
    <AppEmptyState
      icon={<Icons.calendar className='size-10' />}
      title={hasFilters ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có lịch làm việc nào'}
      compact
      action={hasFilters ? <ClearFiltersButton /> : undefined}
    />
  ) : undefined;

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <Tabs
          value={resolvedActiveTab}
          onValueChange={(value) => {
            setParams({ page: 1, tab: value === 'all' ? null : value }, { shallow: true }).catch(() => undefined);
          }}
          className='w-fit'
        >
          <TabsList className='w-fit'>
            {SCHEDULE_STATUS_TABS.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger key={item.value} value={item.value} className='flex items-center gap-1.5'>
                  <Icon className='h-4 w-4' />
                  {item.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Tuần điều hướng */}
        <div className='flex items-center gap-2 text-sm'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='h-9 w-9 rounded-md shrink-0'
            onClick={() => setWeekStart((prev) => addDays(prev, -7))}
          >
            <Icons.chevronLeft className='h-4 w-4' />
          </Button>
          <span className='text-sm font-semibold min-w-[180px] text-center bg-muted/30 py-1.5 px-3 rounded-md border border-border/50'>
            {format(weekStart, 'dd/MM/yyyy')} - {format(addDays(weekStart, 6), 'dd/MM/yyyy')}
          </span>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='h-9 w-9 rounded-md shrink-0'
            onClick={() => setWeekStart((prev) => addDays(prev, 7))}
          >
            <Icons.chevronRight className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-9 px-3 text-xs shrink-0'
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            Tuần này
          </Button>
        </div>
      </div>

      <div className='flex flex-1 flex-col gap-2'>
        <DataTable
          table={table}
          emptyState={emptyState}
        >
          <DataTableToolbar table={table}>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={processedRows.length === 0}
              onClick={() => router.push('/schedule/roster')}
            >
              <Icons.add className='mr-1.5 size-4' />
              Gán ca mới
            </Button>
          </DataTableToolbar>
        </DataTable>

        {detailOpen && selectedRow && (
          <ScheduleDetailSheet
            row={selectedRow}
            open={detailOpen}
            onOpenChange={(open) => {
              if (!open) {
                setParams({ detail: null }).catch(() => undefined);
                setSelectedRow(null);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

export function ScheduleTableSkeleton() {
  return (
    <div className='flex flex-1 flex-col gap-4 rounded-xl border border-border/60 bg-background/50 p-4 shadow-sm'>
      {/* Filters & Navigation Toolbar */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse'>
        <div className='flex gap-1 bg-muted/40 p-1 rounded-lg w-fit'>
          <div className='h-8 w-24 bg-muted rounded-md' />
          <div className='h-8 w-24 bg-muted rounded-md' />
          <div className='h-8 w-28 bg-muted rounded-md' />
        </div>
        <div className='flex items-center gap-2'>
          <div className='h-9 w-9 bg-muted rounded-md' />
          <div className='h-9 w-44 bg-muted rounded-md' />
          <div className='h-9 w-9 bg-muted rounded-md' />
          <div className='h-9 w-16 bg-muted rounded-md' />
        </div>
      </div>

      {/* Toolbar placeholder */}
      <div className='flex items-center justify-between gap-4 animate-pulse pt-2'>
        <div className='h-9 w-64 bg-muted rounded-md' />
        <div className='h-9 w-28 bg-muted rounded-md' />
      </div>

      {/* Table grid skeleton */}
      <div className='rounded-lg border border-border/60 bg-card overflow-hidden'>
        {/* Table Header */}
        <div className='grid grid-cols-6 gap-4 border-b bg-muted/20 px-4 py-3'>
          <div className='h-4 bg-muted rounded w-3/4' />
          <div className='h-4 bg-muted rounded w-1/2' />
          <div className='h-4 bg-muted rounded w-2/3' />
          <div className='h-4 bg-muted rounded w-1/3' />
          <div className='h-4 bg-muted rounded w-1/2' />
          <div className='h-4 bg-muted rounded w-1/4' />
        </div>
        {/* Table Body rows */}
        <div className='divide-y divide-border/40 animate-pulse'>
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className='grid grid-cols-6 gap-4 px-4 py-4 items-center'>
              <div className='flex items-center gap-3'>
                <div className='h-8 w-8 rounded-full bg-muted shrink-0' />
                <div className='space-y-1 w-full'>
                  <div className='h-3 bg-muted rounded w-5/6' />
                  <div className='h-2.5 bg-muted rounded w-1/2' />
                </div>
              </div>
              <div className='h-3.5 bg-muted rounded w-2/3' />
              <div className='space-y-1'>
                <div className='h-3 bg-muted rounded w-3/4' />
                <div className='h-2.5 bg-muted rounded w-1/3' />
              </div>
              <div className='h-3.5 bg-muted rounded w-1/2' />
              <div className='h-3.5 bg-muted rounded w-1/3' />
              <div className='h-6 bg-muted rounded-full w-20' />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination skeleton */}
      <div className='flex items-center justify-between pt-2 animate-pulse'>
        <div className='h-4 w-36 bg-muted rounded' />
        <div className='flex items-center gap-2'>
          <div className='h-8 w-8 bg-muted rounded-md' />
          <div className='h-8 w-8 bg-muted rounded-md' />
          <div className='h-8 w-8 bg-muted rounded-md' />
        </div>
      </div>
    </div>
  );
}

/* ─── Detail Sheet ─── */

function ScheduleDetailSheet({
  row,
  open,
  onOpenChange
}: {
  row: ScheduleRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='w-full sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>{row.employeeName}</SheetTitle>
          <SheetDescription>
            {format(row.workDate + 'T00:00:00', 'dd/MM/yyyy')} · {row.shiftTemplateName}
          </SheetDescription>
        </SheetHeader>
        <div className='mt-6 space-y-4 text-sm'>
          <div className='rounded-lg border p-4 space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>Mã NV</span>
              <span className='font-medium'>{row.employeeId}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>Ca</span>
              <span>{row.shiftTemplateName} ({row.shiftTemplateCode})</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>Giờ</span>
              <span>{row.startTime} - {row.endTime}{row.overnight ? ' (+1)' : ''}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>Thời lượng</span>
              <span>{(() => { const h = Math.floor(row.scheduledMinutes / 60); const r = row.scheduledMinutes % 60; return `${h}h${r > 0 ? r + 'p' : ''}`; })()}</span>
            </div>
            {row.positionName && (
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Vị trí</span>
                <span>{row.positionName}</span>
              </div>
            )}
            {row.locationName && (
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Địa điểm</span>
                <span>{row.locationName}</span>
              </div>
            )}
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>Trạng thái</span>
              <Badge variant={row.assignmentStatus === 'published' ? 'default' : 'secondary'} className='text-xs'>
                {row.assignmentStatus === 'published' ? 'Đã công bố' : row.assignmentStatus === 'planned' ? 'Đã lên kế hoạch' : row.assignmentStatus}
              </Badge>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
