'use client';

import * as React from 'react';
import type { Table } from '@tanstack/react-table';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { appCopy, commonUiCopy } from '@/lib/app-copy';
import { cn } from '@/lib/utils';

export interface DataTablePaginationProps<TData> {
  table?: Table<TData>;
  /** Standalone pagination props if not using TanStack Table */
  page?: number;
  pageCount?: number;
  pageSize?: number;
  total?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
  showSelectedCount?: boolean;
}

export function DataTablePagination<TData>({
  table,
  page: controlledPage,
  pageCount: controlledPageCount,
  pageSize: controlledPageSize,
  total: controlledTotal,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  className,
  showSelectedCount = true,
}: DataTablePaginationProps<TData>) {
  // Resolve state from TanStack Table or standalone props
  const currentPage = table
    ? table.getState().pagination.pageIndex + 1
    : controlledPage ?? 1;

  const totalPages = table
    ? Math.max(1, table.getPageCount())
    : Math.max(1, controlledPageCount ?? 1);

  const currentPageSize = table
    ? table.getState().pagination.pageSize
    : controlledPageSize ?? 20;

  const totalItems = table
    ? (table.getRowCount?.() ?? table.getFilteredRowModel().rows.length)
    : controlledTotal;

  const selectedRowsCount = table
    ? table.getFilteredSelectedRowModel().rows.length
    : 0;

  const canPrevious = currentPage > 1;
  const canNext = currentPage < totalPages;

  const handleFirst = () => {
    if (table) table.setPageIndex(0);
    else onPageChange?.(1);
  };

  const handlePrevious = () => {
    if (table) table.previousPage();
    else onPageChange?.(currentPage - 1);
  };

  const handleNext = () => {
    if (table) table.nextPage();
    else onPageChange?.(currentPage + 1);
  };

  const handleLast = () => {
    if (table) table.setPageIndex(totalPages - 1);
    else onPageChange?.(totalPages);
  };

  const handleSizeChange = (val: string) => {
    const nextSize = Number(val);
    if (table) table.setPageSize(nextSize);
    else onPageSizeChange?.(nextSize);
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 px-2 py-2 text-sm text-muted-foreground',
        className
      )}
      data-slot='data-table-pagination'
    >
      <div className='flex items-center gap-4 text-xs'>
        {table && showSelectedCount && selectedRowsCount > 0 ? (
          <span>
            {appCopy.common.selectedRows(selectedRowsCount, table.getFilteredRowModel().rows.length)}
          </span>
        ) : typeof totalItems === 'number' ? (
          <span>
            {commonUiCopy.columns ? 'Tổng cộng' : 'Tổng'}:{' '}
            <strong className='font-semibold text-foreground'>
              {totalItems.toLocaleString('vi-VN')}
            </strong>
          </span>
        ) : null}
      </div>

      <div className='flex flex-wrap items-center gap-4 sm:gap-6 ml-auto'>
        <div className='flex items-center gap-2 text-xs'>
          <span className='hidden sm:inline'>{appCopy.common.rowsPerPage}</span>
          <Select
            value={String(currentPageSize)}
            onValueChange={handleSizeChange}
          >
            <SelectTrigger className='h-8 w-[72px] text-xs' aria-label={appCopy.common.rowsPerPage}>
              <SelectValue placeholder={String(currentPageSize)} />
            </SelectTrigger>
            <SelectContent side='top'>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)} className='text-xs'>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex items-center justify-center text-xs font-medium text-foreground min-w-[70px]'>
          {appCopy.common.pageOf(currentPage, totalPages)}
        </div>

        <div className='flex items-center gap-1'>
          <Button
            variant='outline'
            size='icon'
            className='size-8'
            onClick={handleFirst}
            disabled={!canPrevious}
            aria-label={appCopy.common.firstPage}
          >
            <Icons.chevronsLeft className='size-4' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='size-8'
            onClick={handlePrevious}
            disabled={!canPrevious}
            aria-label={appCopy.common.previousPage}
          >
            <Icons.chevronLeft className='size-4' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='size-8'
            onClick={handleNext}
            disabled={!canNext}
            aria-label={appCopy.common.nextPage}
          >
            <Icons.chevronRight className='size-4' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='size-8'
            onClick={handleLast}
            disabled={!canNext}
            aria-label={appCopy.common.lastPage}
          >
            <Icons.chevronsRight className='size-4' />
          </Button>
        </div>
      </div>
    </div>
  );
}
