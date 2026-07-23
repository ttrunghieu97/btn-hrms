'use client';

import * as React from 'react';
import { formatDateVN } from "@/lib/date";
import { useQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { customFetch } from '@/lib/fetcher';

import { queryPolicyPresets } from '@/lib/query-client';
import { perPageParser, pageParser } from '@/lib/pagination';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface DocumentRow {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string | null;
  departmentName: string | null;
  documentType: string;
  fileId: string;
  fileUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { pagination: { total: number; page: number; limit: number; hasNext: boolean } };
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const ACTIVE_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'true', label: 'Đang sử dụng' },
  { value: 'false', label: 'Không hoạt động' },
] as const;

function formatDate(v: string | Date | null | undefined) {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : formatDateVN(d);
}

/* ------------------------------------------------------------------ */
/* Columns                                                             */
/* ------------------------------------------------------------------ */

const columns: ColumnDef<DocumentRow>[] = [
  {
    id: 'employeeName', accessorFn: (r) => r.employeeName,
    header: 'Nhân viên',
    cell: ({ row }) => (
      <div className='flex flex-col'>
        <span className='font-medium'>{row.original.employeeName}</span>
        <span className='text-muted-foreground text-xs'>{row.original.employeeCode || '—'}</span>
      </div>
    ),
    meta: { label: 'Nhân viên', variant: 'text' as const },
    enableColumnFilter: true,
  },
  {
    id: 'departmentName', accessorFn: (r) => r.departmentName ?? '',
    header: 'Phòng ban', cell: ({ row }) => <span className='text-sm'>{row.original.departmentName || '—'}</span>,
    meta: { label: 'Phòng ban' },
  },
  {
    id: 'documentType', accessorFn: (r) => r.documentType,
    header: 'Loại hồ sơ',
    cell: ({ row }) => <Badge variant='secondary' className='font-normal'>{row.original.documentType}</Badge>,
    meta: { label: 'Loại hồ sơ' },
  },
  {
    id: 'isActive', accessorFn: (r) => r.isActive,
    header: 'Trạng thái',
    cell: ({ row }) => {
      const a = row.original.isActive;
      return (
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${a ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
          {a ? 'Đang sử dụng' : 'Không hoạt động'}
        </span>
      );
    },
    meta: { label: 'Trạng thái' },
  },
  {
    id: 'createdAt', accessorFn: (r) => r.createdAt ? new Date(r.createdAt).toISOString() : '',
    header: 'Ngày tạo', cell: ({ row }) => <span className='text-sm'>{formatDate(row.original.createdAt)}</span>,
    meta: { label: 'Ngày tạo' },
  },
];

/* ------------------------------------------------------------------ */
/* Query keys                                                          */
/* ------------------------------------------------------------------ */

const documentKeys = {
  list: (p: Record<string, unknown>) => ['documents', 'list', p] as const,
};

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function DocumentsView() {
  const [params, setParams] = useQueryStates({
    page: pageParser,
    perPage: perPageParser,
    search: parseAsString,
    isActive: parseAsString,
  });
  const [selectedDoc, setSelectedDoc] = React.useState<DocumentRow | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const q = React.useMemo(() => {
    const p: Record<string, unknown> = { page: params.page, limit: params.perPage };
    if (params.search) p.search = params.search;
    if (params.isActive === 'true') p.isActive = true;
    else if (params.isActive === 'false') p.isActive = false;
    return p;
  }, [params]);

  const { data, isLoading } = useQuery({
    queryKey: documentKeys.list(q),
    queryFn: async () => {
      const sp = new URLSearchParams();
      Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== '' && v !== false) sp.set(k, String(v)); });
      const res = await customFetch<PaginatedResponse<DocumentRow>>(`/api/v1/documents?${sp.toString()}`);
      return res;
    },
    ...queryPolicyPresets.employees,
  });

  const paginated = data?.data as PaginatedResponse<DocumentRow> | undefined;
  const documents = paginated?.data ?? [];
  const total = paginated?.meta?.pagination?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / params.perPage));

  const { table } = useDataTable({
    data: documents,
    columns,
    pageCount,
    shallow: true,
    debounceMs: 500,
    tableId: 'documents',
  });

  const handleRowClick = React.useCallback((row: Row<DocumentRow>) => {
    setSelectedDoc(row.original);
    setSheetOpen(true);
  }, []);

  const setParam = (key: string, value: string) => {
    setParams({ ...params, page: 1, [key]: value || null }, { shallow: true }).catch(() => {});
  };

  const hasFilters = Boolean(params.search || params.isActive);
  const clearFilters = () => setParams({ page: 1, search: null, isActive: null }, { shallow: true }).catch(() => {});

  return (
    <div className='flex flex-1 flex-col gap-4 min-h-0'>
      <DataTable table={table} isLoading={isLoading} onRowClick={handleRowClick}>
        <DataTableToolbar table={table}>
          <div className='flex items-center gap-2 flex-wrap'>
            <Select value={params.isActive ?? ''} onValueChange={(v) => setParam('isActive', v)}>
              <SelectTrigger className='h-9 w-[160px]'>
                <SelectValue placeholder='Trạng thái' />
              </SelectTrigger>
              <SelectContent>
                {ACTIVE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant='ghost' size='sm' onClick={clearFilters} className='h-9'>
                <Icons.refresh className='mr-1.5 size-3.5' />
                Xoá lọc
              </Button>
            )}
          </div>
        </DataTableToolbar>
      </DataTable>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side='right' className='w-full sm:max-w-lg overflow-y-auto'>
          <SheetHeader className='mb-6'>
            <SheetTitle>Chi tiết hồ sơ</SheetTitle>
            <SheetDescription>Thông tin hồ sơ của nhân viên</SheetDescription>
          </SheetHeader>
          {selectedDoc && (
            <div className='space-y-6'>
              <div className='pb-4 border-b'>
                <p className='font-medium'>{selectedDoc.employeeName}</p>
                <p className='text-muted-foreground text-xs'>{selectedDoc.employeeCode} · {selectedDoc.departmentName}</p>
              </div>
              <div>
                <h4 className='text-sm font-semibold mb-2'>Loại hồ sơ</h4>
                <Badge variant='secondary'>{selectedDoc.documentType}</Badge>
              </div>
              <div>
                <h4 className='text-sm font-semibold mb-2'>Trạng thái</h4>
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${selectedDoc.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
                  {selectedDoc.isActive ? 'Đang sử dụng' : 'Không hoạt động'}
                </span>
              </div>
              {selectedDoc.fileId && (
                <div>
                  <h4 className='text-sm font-semibold mb-2'>File</h4>
                  <Button variant='outline' size='sm' asChild>
                    <a href={`/api/v1/files/${selectedDoc.fileId}`} target='_blank' rel='noopener noreferrer'>
                      <Icons.page className='mr-1.5 size-3.5' />
                      Xem file
                    </a>
                  </Button>
                </div>
              )}
              <div className='pt-2'>
                <Button variant='outline' size='sm' className='w-full' asChild>
                  <a href={`/employees/${selectedDoc.employeeId}`}>
                    <Icons.externalLink className='mr-1.5 size-3.5' />
                    Xem chi tiết nhân viên
                  </a>
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
