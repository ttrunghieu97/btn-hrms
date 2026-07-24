'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { customFetch } from '@/lib/fetcher';

import { queryPolicyPresets } from '@/lib/query-client';
import { EmployeeContractCard } from './cards/contract/employee-contract-card';
import { perPageParser, pageParser } from '@/lib/pagination';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ContractRow {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string | null;
  departmentName: string | null;
  contractNumber: string | null;
  contractType: string;
  status: string;
  version: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { pagination: { total: number; page: number; limit: number; hasNext: boolean } };
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const CONTRACT_TYPES = [
  { value: '', label: 'Tất cả loại HĐ' },
  { value: 'permanent', label: 'Chính thức' },
  { value: 'fixed_term', label: 'Có thời hạn' },
  { value: 'probationary', label: 'Thử việc' },
  { value: 'internship', label: 'Thực tập' },
  { value: 'service', label: 'Dịch vụ' },
  { value: 'part_time', label: 'Bán thời gian' },
] as const;

const CONTRACT_STATUSES = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang hiệu lực' },
  { value: 'terminated', label: 'Đã kết thúc' },
  { value: 'superseded', label: 'Đã thay thế' },
  { value: 'draft', label: 'Bản nháp' },
] as const;

const EXPIRES_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: '7', label: '7 ngày tới' },
  { value: '14', label: '14 ngày tới' },
  { value: '30', label: '30 ngày tới' },
  { value: '60', label: '60 ngày tới' },
  { value: '90', label: '90 ngày tới' },
] as const;

const contractTypeLabel: Record<string, string> = {
  permanent: 'Chính thức', fixed_term: 'Có thời hạn', probationary: 'Thử việc',
  internship: 'Thực tập', service: 'Dịch vụ', part_time: 'Bán thời gian',
};

const contractStatusColor: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  terminated: 'bg-muted text-muted-foreground',
  superseded: 'bg-muted text-muted-foreground',
  draft: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

function formatDate(v: string | null | undefined) { return v ?? '—'; }

/* ------------------------------------------------------------------ */
/* Columns                                                             */
/* ------------------------------------------------------------------ */

const columns: ColumnDef<ContractRow>[] = [
  {
    id: 'employeeName',
    accessorFn: (r) => r.employeeName,
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
    header: 'Phòng ban',
    cell: ({ row }) => <span className='text-sm'>{row.original.departmentName || '—'}</span>,
    meta: { label: 'Phòng ban' },
  },
  {
    id: 'contractNumber', accessorFn: (r) => r.contractNumber ?? '',
    header: 'Số HĐ',
    cell: ({ row }) => <span className='text-sm'>{row.original.contractNumber || '—'}</span>,
    meta: { label: 'Số HĐ' },
  },
  {
    id: 'contractType', accessorFn: (r) => contractTypeLabel[r.contractType] ?? r.contractType,
    header: 'Loại HĐ',
    cell: ({ row }) => <span className='text-sm'>{contractTypeLabel[row.original.contractType] ?? row.original.contractType}</span>,
    meta: { label: 'Loại HĐ' },
  },
  {
    id: 'status', accessorFn: (r) => r.status,
    header: 'Trạng thái',
    cell: ({ row }) => {
      const s = row.original.status;
      const labels: Record<string, string> = { active: 'Đang hiệu lực', terminated: 'Đã kết thúc', superseded: 'Đã thay thế', draft: 'Bản nháp' };
      return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${contractStatusColor[s] ?? 'bg-muted text-muted-foreground'}`}>{labels[s] ?? s}</span>;
    },
    meta: { label: 'Trạng thái', toolbarHidden: true },
  },
  {
    id: 'version', accessorFn: (r) => r.version,
    header: 'V', cell: ({ row }) => <span className='text-sm'>V{row.original.version}</span>,
    meta: { label: 'Phiên bản' },
  },
  {
    id: 'effectiveFrom', accessorFn: (r) => r.effectiveFrom,
    header: 'Hiệu lực từ', cell: ({ row }) => <span className='text-sm'>{formatDate(row.original.effectiveFrom)}</span>,
    meta: { label: 'Hiệu lực từ' },
  },
  {
    id: 'effectiveTo', accessorFn: (r) => r.effectiveTo ?? '',
    header: 'Hiệu lực đến', cell: ({ row }) => <span className='text-sm'>{formatDate(row.original.effectiveTo)}</span>,
    meta: { label: 'Hiệu lực đến' },
  },
];

/* ------------------------------------------------------------------ */
/* Query keys                                                          */
/* ------------------------------------------------------------------ */

const contractKeys = {
  list: (p: Record<string, unknown>) => ['contracts', 'list', p] as const,
};

/* ------------------------------------------------------------------ */
/* Toolbar filter group                                                */
/* ------------------------------------------------------------------ */

function FilterSelect({ value, onValueChange, options, placeholder }: {
  value: string; onValueChange: (v: string) => void;
  options: ReadonlyArray<{ readonly value: string; readonly label: string }>;
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className='h-9 w-[160px]'>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function ContractsView() {
  const [params, setParams] = useQueryStates({
    page: pageParser,
    perPage: perPageParser,
    search: parseAsString,
    departmentId: parseAsString,
    contractType: parseAsString,
    status: parseAsString,
    expiresWithin: parseAsString,
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const q = React.useMemo(() => {
    const p: Record<string, unknown> = { page: params.page, limit: params.perPage };
    if (params.search) p.search = params.search;
    if (params.departmentId) p.departmentId = params.departmentId;
    if (params.contractType) p.contractType = params.contractType;
    if (params.status) p.status = params.status;
    if (params.expiresWithin) p.expiresWithin = Number(params.expiresWithin);
    return p;
  }, [params]);

  const { data, isLoading } = useQuery({
    queryKey: contractKeys.list(q),
    queryFn: async () => {
      const sp = new URLSearchParams();
      Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== '' && v !== 0) sp.set(k, String(v)); });
      const res = await customFetch<PaginatedResponse<ContractRow>>(`/api/v1/contracts?${sp.toString()}`);
      return res;
    },
    ...queryPolicyPresets.employees,
  });

  const paginated = data?.data as PaginatedResponse<ContractRow> | undefined;
  const contracts = paginated?.data ?? [];
  const total = paginated?.meta?.pagination?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / params.perPage));

  const { table } = useDataTable({
    data: contracts,
    columns,
    pageCount,
    shallow: true,
    debounceMs: 500,
    tableId: 'contracts',
  });

  const handleRowClick = React.useCallback((row: Row<ContractRow>) => {
    setSelectedEmployeeId(row.original.employeeId);
    setSheetOpen(true);
  }, []);

  const setParam = (key: string, value: string) => {
    setParams({ ...params, page: 1, [key]: value || null }, { shallow: true }).catch(() => {});
  };

  const hasFilters = Boolean(params.search || params.departmentId || params.contractType || params.status || params.expiresWithin);
  const clearFilters = () => setParams({
    page: 1, search: null, departmentId: null, contractType: null, status: null, expiresWithin: null,
  }, { shallow: true }).catch(() => {});

  return (
    <div className='flex flex-1 flex-col gap-4 min-h-0'>
      <DataTable table={table} isLoading={isLoading}>
        <DataTableToolbar table={table}>
          <div className='flex items-center gap-2 flex-wrap'>
            <FilterSelect value={params.contractType ?? ''} onValueChange={(v) => setParam('contractType', v)}
              options={CONTRACT_TYPES} placeholder='Loại hợp đồng' />
            <FilterSelect value={params.status ?? ''} onValueChange={(v) => setParam('status', v)}
              options={CONTRACT_STATUSES} placeholder='Trạng thái' />
            <FilterSelect value={params.expiresWithin ?? ''} onValueChange={(v) => setParam('expiresWithin', v)}
              options={EXPIRES_OPTIONS} placeholder='Sắp hết hạn' />
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
            <SheetTitle>{'Hợp đồng nhân sự'}</SheetTitle>
            <SheetDescription>{'Chi tiết hợp đồng và lịch sử thay đổi'}</SheetDescription>
          </SheetHeader>
          {selectedEmployeeId && <EmployeeContractCard employeeId={selectedEmployeeId} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
