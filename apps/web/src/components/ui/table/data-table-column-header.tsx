'use client';

import type { Column } from '@tanstack/react-table';
import { ChevronDownIcon, ChevronUpIcon, CaretSortIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DataTableColumnHeaderProps<TData, TValue> extends React.ComponentProps<typeof Button> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const sorted = column.getIsSorted();

  return (
    <Button
      type='button'
      variant='ghost'
      className={cn('-ml-2 h-8 px-2 font-medium', className)}
      onClick={() => column.toggleSorting(sorted === 'asc')}
      {...props}
    >
      <span>{title}</span>
      {sorted === 'desc' ? (
        <ChevronDownIcon className='text-muted-foreground ml-1 size-4' />
      ) : sorted === 'asc' ? (
        <ChevronUpIcon className='text-muted-foreground ml-1 size-4' />
      ) : (
        <CaretSortIcon className='text-muted-foreground ml-1 size-4' />
      )}
    </Button>
  );
}
