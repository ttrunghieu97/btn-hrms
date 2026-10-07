'use client';

import type { Row, Table as TanstackTable } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DataTableCardViewProps<TData> {
  table: TanstackTable<TData>;
  onRowClick?: (row: Row<TData>) => void;
  onRowMouseEnter?: (row: Row<TData>) => void;
  getRowClassName?: (row: Row<TData>) => string | undefined;
}

export function DataTableCardView<TData>({
  table,
  onRowClick,
  onRowMouseEnter,
  getRowClassName
}: DataTableCardViewProps<TData>) {
  const rows = table.getRowModel().rows;
  const columns = table.getAllColumns().filter(
    (col) => col.getIsVisible() && col.id !== 'select' && col.id !== 'actions'
  );
  const actionColumn = table.getAllColumns().find((col) => col.id === 'actions');

  if (!rows.length) return null;

  return (
    <div className='flex flex-col gap-3'>
      {rows.map((row) => (
        <Card
          key={row.id}
          className={cn(
            'p-4',
            onRowClick &&
              'hover:bg-accent/50 cursor-pointer transition-colors focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
            getRowClassName?.(row)
          )}
          tabIndex={onRowClick ? 0 : undefined}
          onClick={
            onRowClick
              ? (e) => {
                  const target = e.target as HTMLElement | null;
                  if (
                    target?.closest(
                      'button, a, input, select, textarea, [role="button"], [role="menuitem"], [data-prevent-row-click="true"]'
                    )
                  ) {
                    return;
                  }
                  onRowClick(row);
                }
              : undefined
          }
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
          onMouseEnter={onRowMouseEnter ? () => onRowMouseEnter(row) : undefined}
        >
          <div className='flex items-start justify-between'>
            <div className='flex-1 space-y-2'>
              {columns.map((column) => {
                const cell = row.getAllCells().find((c) => c.column.id === column.id);
                if (!cell) return null;
                const meta = (column.columnDef as unknown as Record<string, unknown>).meta as
                  | { label?: string }
                  | undefined;
                return (
                  <div key={column.id} className='flex items-baseline justify-between gap-2 text-sm'>
                    <span className='text-muted-foreground shrink-0 text-xs font-medium'>
                      {meta?.label ?? column.id}
                    </span>
                    <span className='text-right'>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </span>
                  </div>
                );
              })}
            </div>
            {actionColumn && (
              <div className='ml-2 shrink-0' data-prevent-row-click='true'>
                {flexRender(
                  actionColumn.columnDef.cell,
                  row.getAllCells().find((c) => c.column.id === 'actions')?.getContext()!
                )}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
