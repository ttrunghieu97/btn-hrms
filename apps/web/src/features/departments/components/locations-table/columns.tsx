'use client';

import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import type { LocationListItemDto } from '../../queries/department-queries';
import type { ColumnDef } from '@tanstack/react-table';

export const LOCATION_TYPE_LABELS: Record<string, string> = {
  office: 'Văn phòng',
  factory: 'Nhà máy / Xưởng',
  warehouse: 'Kho bãi',
  remote: 'Làm việc từ xa',
  client_site: 'Tại khách hàng',
  hybrid: 'Kết hợp (Hybrid)'
};

export const columns: ColumnDef<LocationListItemDto>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Tên địa điểm' />
    ),
    cell: ({ row, table }) => {
      const onRowClick = (table.options.meta as { onRowClick?: (row: LocationListItemDto) => void })?.onRowClick;
      return (
        <div className='flex items-center gap-2'>
          <Icons.department className='text-muted-foreground h-4 w-4 shrink-0' />
          {onRowClick ? (
            <button
              type='button'
              onClick={() => onRowClick(row.original)}
              className='font-medium text-foreground hover:text-primary hover:underline text-left cursor-pointer'
            >
              {row.original.name}
            </button>
          ) : (
            <span className='font-medium'>{row.original.name}</span>
          )}
        </div>
      );
    },
    meta: {
      label: 'Tên địa điểm',
      placeholder: 'Tìm kiếm theo tên địa điểm...',
      variant: 'text' as const,
      icon: Icons.search
    },
    enableColumnFilter: true
  },
  {
    id: 'type',
    accessorKey: 'type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Loại địa điểm' />
    ),
    cell: ({ row }) => (
      <Badge variant='outline'>
        {LOCATION_TYPE_LABELS[row.original.type] ?? row.original.type}
      </Badge>
    )
  },
  {
    id: 'address',
    accessorKey: 'address',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Địa chỉ' />
    ),
    cell: ({ row }) => (
      <span className='text-muted-foreground text-sm line-clamp-1 max-w-xs'>
        {row.original.address || '—'}
      </span>
    )
  },
  {
    id: 'coordinates',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Tọa độ GPS (Geofencing)' />
    ),
    cell: ({ row }) => {
      const { latitude, longitude } = row.original;
      if (!latitude || !longitude) {
        return <span className='text-muted-foreground text-xs'>Chưa thiết lập</span>;
      }
      return (
        <span className='font-mono text-xs text-muted-foreground'>
          {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
        </span>
      );
    }
  },
  {
    id: 'radiusMeters',
    accessorKey: 'radiusMeters',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Bán kính chấm công' />
    ),
    cell: ({ row }) => (
      <span className='text-muted-foreground text-sm'>
        {row.original.radiusMeters != null ? `${row.original.radiusMeters} m` : '—'}
      </span>
    )
  },
  {
    id: 'isActive',
    accessorKey: 'isActive',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Trạng thái' />
    ),
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
        {row.original.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
      </Badge>
    )
  }
];
