import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { DataTable } from './data-table';

type RowData = {
  name: string;
  role: string;
};

function TestTable({ onRowClick }: { onRowClick?: (row: import('@tanstack/react-table').Row<RowData>) => void } = {}) {
  const columns = React.useMemo<ColumnDef<RowData>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => row.original.name
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => row.original.role
      }
    ],
    []
  );

  const table = useReactTable({
    data: [{ name: 'Admin', role: 'System Admin' }],
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return <DataTable table={table} onRowClick={onRowClick} />;
}

describe('DataTable', () => {
  it('preserves intrinsic table width for horizontal scrolling', () => {
    render(<TestTable />);

    expect(screen.getByRole('table')).toHaveClass('w-max');
  });

  it('preserves the row role and supports keyboard row activation', () => {
    const onRowClick = jest.fn();
    render(<TestTable onRowClick={onRowClick} />);

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((r) => {
      expect(r.getAttribute('role')).not.toBe('button');
    });

    const dataRow = rows.at(-1)!;
    expect(dataRow).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(dataRow, { key: 'Enter' });
    fireEvent.keyDown(dataRow, { key: ' ' });
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });
});
