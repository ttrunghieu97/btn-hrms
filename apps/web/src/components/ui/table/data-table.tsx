import { type Row, type Table as TanstackTable, flexRender } from '@tanstack/react-table';
import * as React from 'react';
import { useMemo } from 'react';

import { DataTableCardView } from '@/components/ui/table/data-table-card-view';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getCommonPinningStyles } from '@/lib/data-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { commonUiCopy } from '@/lib/app-copy';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const MotionTableBody = motion.create(TableBody);

interface DataTableProps<TData> extends React.ComponentProps<'div'> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
  onRowClick?: (row: Row<TData>) => void;
  onRowMouseEnter?: (row: Row<TData>) => void;
  getRowClassName?: (row: Row<TData>) => string | undefined;
  hidePagination?: boolean;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  animationKey?: string;
  totalRowsLabel?: string;
  totalRows?: number;
}

export function DataTable<TData>({
  table,
  actionBar,
  onRowClick,
  onRowMouseEnter,
  getRowClassName,
  hidePagination = false,
  emptyState,
  isLoading = false,
  animationKey,
  totalRowsLabel,
  totalRows,
  children,
  className,
  ...props
}: DataTableProps<TData>) {
  const hasSelectedRows = table.getFilteredSelectedRowModel().rows.length > 0;
  const shouldReduceMotion = useReducedMotion();

  /* Derive a stable key from pagination so that page/pageSize changes
     trigger AnimatePresence enter/exit for a smooth transition.
     Consumers can override via animationKey prop. */
  const computedKey = useMemo(() => {
    const { pageIndex, pageSize } = table.getState().pagination;
    return animationKey ?? `p-${pageIndex}-${pageSize}`;
  }, [animationKey, table]);

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-4', className)} {...props}>
      {children}
      <div className='rpi-table-scope min-h-0 flex-1 overflow-hidden rounded-lg border bg-background/50'>
        <div className='rpi-card-view p-4'>
          <AnimatePresence mode='wait'>
            {isLoading ? (
              <motion.div
                key='loading-cards'
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={shouldReduceMotion ? {} : { opacity: 1 }}
                exit={shouldReduceMotion ? {} : { opacity: 0 }}
                transition={{ duration: 0.12 }}
                className='flex flex-col gap-3'
              >
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className='p-4 space-y-3 animate-pulse'>
                    <div className='h-4 w-1/3 rounded bg-muted' />
                    <div className='h-4 w-full rounded bg-muted/60' />
                    <div className='h-4 w-2/3 rounded bg-muted/60' />
                  </Card>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key={computedKey}
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={shouldReduceMotion ? {} : { opacity: 1 }}
                exit={shouldReduceMotion ? {} : { opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <DataTableCardView
                  table={table}
                  onRowClick={onRowClick}
                  onRowMouseEnter={onRowMouseEnter}
                  getRowClassName={getRowClassName}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className='rpi-table-full h-full min-h-0 flex-1'>
          <ScrollArea className='h-full w-full'>
            <Table
              className={cn(table.getAllFlatColumns().some((col) => col.getCanResize()) && 'table-fixed')}
              style={{
                width: table.getAllFlatColumns().some((col) => col.getCanResize())
                  ? table.getTotalSize()
                  : undefined
              }}
            >
              {table.getAllFlatColumns().some((col) => col.getCanResize()) && (
                <colgroup>
                  {table.getVisibleFlatColumns().map((column) => (
                    <col key={column.id} style={{ width: column.getSize() }} />
                  ))}
                </colgroup>
              )}
              <TableHeader className='bg-muted sticky top-0 z-10'>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        className={cn(
                          'relative group/resizable',
                          (header.column.columnDef.meta as { responsivePriority?: string } | undefined)?.responsivePriority === 'supporting' && 'rpi-priority-supporting',
                          (header.column.columnDef.meta as { responsivePriority?: string } | undefined)?.responsivePriority === 'rich' && 'rpi-priority-rich'
                        )}
                        style={{
                          ...getCommonPinningStyles({ column: header.column })
                        }}
                      >
                        <div className={cn(header.column.getCanResize() && 'truncate w-full pr-3')}>
                          {header.isPlaceholder
                             ? null
                             : flexRender(header.column.columnDef.header, header.getContext())}
                        </div>
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={cn(
                              'absolute right-0 top-0 h-full w-1 cursor-col-resize select-none bg-border/20 group-hover/resizable:bg-primary/40 transition-colors z-20',
                              header.column.getIsResizing() && 'bg-primary w-1.5'
                            )}
                          />
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <AnimatePresence mode='wait'>
                <MotionTableBody
                  key={computedKey}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                  animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? {} : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.1, ease: 'easeOut' }}
                  style={{ willChange: 'transform, opacity' }}
                >
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={`skeleton-${i}`} className='hover:bg-transparent'>
                        {table.getVisibleFlatColumns().map((column, j) => (
                          <TableCell
                            key={j}
                            className={cn(
                              (column.columnDef.meta as { responsivePriority?: string } | undefined)?.responsivePriority === 'supporting' && 'rpi-priority-supporting',
                              (column.columnDef.meta as { responsivePriority?: string } | undefined)?.responsivePriority === 'rich' && 'rpi-priority-rich'
                            )}
                            style={{
                              ...getCommonPinningStyles({ column })
                            }}
                          >
                            <Skeleton className='h-5 w-full bg-muted/50' />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                        className={cn(
                          onRowClick &&
                            'focus-visible:ring-ring cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                          getRowClassName?.(row)
                        )}
                        role={onRowClick ? 'button' : undefined}
                        tabIndex={onRowClick ? 0 : undefined}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        onMouseEnter={onRowMouseEnter ? () => onRowMouseEnter(row) : undefined}
                        onKeyDown={
                          onRowClick
                            ? (event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  onRowClick(row);
                                }
                              }
                            : undefined
                        }
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              (cell.column.columnDef.meta as { responsivePriority?: string } | undefined)?.responsivePriority === 'supporting' && 'rpi-priority-supporting',
                              (cell.column.columnDef.meta as { responsivePriority?: string } | undefined)?.responsivePriority === 'rich' && 'rpi-priority-rich'
                            )}
                            style={{
                              ...getCommonPinningStyles({ column: cell.column })
                            }}
                          >
                            <div className={cn(cell.column.getCanResize() && 'truncate w-full')}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : emptyState ? (
                    <TableRow>
                      <TableCell colSpan={table.getAllColumns().length} className='h-24 text-center'>
                        {emptyState}
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={table.getAllColumns().length} className='h-24 text-center'>
                        {commonUiCopy.noResults}
                      </TableCell>
                    </TableRow>
                  )}
                </MotionTableBody>
              </AnimatePresence>
            </Table>
            <ScrollBar orientation='horizontal' />
          </ScrollArea>
        </div>
      </div>
      {totalRowsLabel ? (
        <div className='flex items-center justify-between px-1 py-1 text-xs text-muted-foreground shrink-0 mt-auto'>
          <div className='flex items-center gap-2'>
            <span>
              {totalRowsLabel}: <strong className='font-semibold text-foreground text-sm ml-1'>
                {typeof totalRows === 'number'
                  ? totalRows
                  : table.getFilteredRowModel().rows.length}
              </strong>
            </span>
          </div>
          {table.getPageCount() > 1 ? (
            <span className='font-medium'>
              Trang {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
          ) : null}
        </div>
      ) : null}
      {actionBar && hasSelectedRows ? (
        <div className='mt-auto flex flex-col gap-2.5'>
          {actionBar}
        </div>
      ) : null}
    </div>
  );
}
