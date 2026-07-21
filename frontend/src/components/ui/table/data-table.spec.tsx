import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { DataTable } from './data-table';

type RowData = {
  name: string;
  role: string;
};

function TestTable() {
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

  return <DataTable table={table} />;
}

describe('DataTable', () => {
  it('preserves intrinsic table width for horizontal scrolling', () => {
    render(<TestTable />);

    expect(screen.getByRole('table')).toHaveClass('w-max');
  });
});
