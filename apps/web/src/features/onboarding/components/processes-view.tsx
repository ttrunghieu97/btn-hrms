'use client';

import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsString } from 'nuqs';
import { onboardingProcessesQueryOptions, onboardingTemplatesQueryOptions } from '../api/queries';
import { useCreateOnboardingProcess } from '../api/mutations';
import { employeesQueryOptions } from '@/features/employees';
import { extractList, extractPagination } from '@/lib/api-extract';
import { StatusBadge, type StatusMap } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { DataTableFacetedFilter } from '@/components/ui/table/data-table-faceted-filter';
import { useDataTable } from '@/hooks/use-data-table';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { Icons } from '@/components/icons';
import { commonUiCopy } from '@/lib/app-copy';
import { formatDateVN } from '@/lib/date';
import Link from 'next/link';
import { pageParser, limitParser } from '@/lib/pagination';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyPermission } from '@project/permissions';
import { permissions } from '@/lib/permissions';

const ONBOARDING_STATUS_MAP: StatusMap = {
  pending: { label: 'Chờ xử lý', variant: 'outline' },
  in_progress: { label: 'Đang thực hiện', variant: 'secondary' },
  completed: { label: 'Hoàn tất', variant: 'default' },
  cancelled: { label: 'Đã hủy', variant: 'destructive' },
  terminated: { label: 'Kết thúc', variant: 'outline' },
};

const STATUS_FILTER_OPTIONS = [
  { label: 'Chờ xử lý', value: 'pending' },
  { label: 'Đang thực hiện', value: 'in_progress' },
  { label: 'Hoàn tất', value: 'completed' },
  { label: 'Đã hủy', value: 'cancelled' },
  { label: 'Kết thúc', value: 'terminated' },
];

interface OnboardingProcessRow {
  id: string;
  employeeId: string;
  status: string;
  startDate: string;
  completedAt: string | null;
  createdAt: string;
}

interface OnboardingTemplateOption {
  id: string;
  name: string;
}

const columnHelper = createColumnHelper<OnboardingProcessRow>();

export function OnboardingProcessesView() {
  const user = useAuthStore((s) => s.user);
  const userPermissions = user?.permissions ?? [];
  const canEdit = Boolean(
    user?.isSuperAdmin ||
      userPermissions.includes('ALL') ||
      userPermissions.includes('sys:all') ||
      hasAnyPermission(userPermissions, [
        permissions.employees.edit,
        permissions.employees.update,
      ]),
  );

  const [params] = useQueryStates({
    page: pageParser,
    limit: limitParser,
    status: parseAsString,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [joinDate, setJoinDate] = useState('');

  const createProcessMutation = useCreateOnboardingProcess();

  const { data, error, isLoading, refetch } = useQuery(
    onboardingProcessesQueryOptions(params.page, params.limit, params.status),
  );
  const { data: employeesData } = useQuery(employeesQueryOptions({ page: 1, limit: 200 }));
  const { data: templatesData } = useQuery({
    ...onboardingTemplatesQueryOptions(),
    enabled: createOpen,
  });

  const employeeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const emp of employeesData?.employees ?? []) {
      const fullName = [emp.lastName, emp.firstName].filter(Boolean).join(' ');
      map.set(emp.id, emp.employeeCode ? `${fullName} (${emp.employeeCode})` : fullName);
    }
    return map;
  }, [employeesData]);

  const templates = extractList<OnboardingTemplateOption>(templatesData);
  const rows = extractList<OnboardingProcessRow>(data);
  const pagination = extractPagination(data);
  const pageCount = Math.max(1, Math.ceil((pagination?.total ?? 0) / params.limit));

  const columns = useMemo(
    () => [
      columnHelper.accessor('employeeId', {
        id: 'employee',
        header: commonUiCopy.employee ?? 'Nhân viên',
        cell: ({ getValue }) => {
          const empId = getValue();
          const label = empId ? employeeMap.get(empId) : undefined;
          return label ? (
            <span className='text-sm font-medium'>{label}</span>
          ) : (
            <span className='font-mono text-xs'>{empId?.slice(0, 8) ?? '—'}</span>
          );
        },
      }),
      columnHelper.accessor('status', {
        id: 'status',
        header: 'Trạng thái',
        meta: { options: STATUS_FILTER_OPTIONS },
        cell: ({ getValue }) => {
          const status = getValue();
          return <StatusBadge status={status ?? ''} mapping={ONBOARDING_STATUS_MAP} />;
        },
      }),
      columnHelper.accessor('startDate', {
        id: 'startDate',
        header: 'Ngày bắt đầu',
        cell: ({ getValue }) => (
          <span className='text-sm'>{getValue() ? formatDateVN(getValue()) : '—'}</span>
        ),
      }),
      columnHelper.accessor('completedAt', {
        id: 'completedAt',
        header: 'Ngày hoàn tất',
        cell: ({ getValue }) => (
          <span className='text-sm'>{getValue() ? formatDateVN(getValue()) : '—'}</span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const { id } = row.original;
          return (
            <Button variant='ghost' size='sm' asChild>
              <Link href={`/onboarding?id=${id}`}>Chi tiết</Link>
            </Button>
          );
        },
      }),
    ],
    [employeeMap],
  );

  const { table } = useDataTable({
    data: rows,
    columns,
    pageCount,
    tableId: 'onboarding-processes',
  });

  const handleCreateSubmit = () => {
    if (!selectedEmployeeId || !selectedTemplateId) return;
    createProcessMutation.mutate(
      {
        employeeId: selectedEmployeeId,
        templateId: selectedTemplateId,
        ...(joinDate ? { joinDate } : {}),
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setSelectedEmployeeId('');
          setSelectedTemplateId('');
          setJoinDate('');
        },
      },
    );
  };

  if (error && !isLoading) {
    return (
      <QueryErrorAlert
        error={error}
        subject='Quy trình Onboarding'
        onRetry={() => void refetch()}
        className='rounded-lg border-destructive/50 bg-destructive/5'
      />
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>Quy trình Onboarding</h2>
        {canEdit && (
          <Button size='sm' onClick={() => setCreateOpen(true)}>
            <Icons.add className='mr-1.5 size-4' />
            Khởi tạo Onboarding
          </Button>
        )}
      </div>

      <DataTable
        table={table}
        isLoading={isLoading}
        totalRows={pagination?.total}
        emptyState={
          <AppEmptyState
            icon={<Icons.user2 className='size-10' />}
            title='Chưa có quy trình onboarding nào'
            compact
          />
        }
      >
        <DataTableToolbar table={table}>
          <DataTableFacetedFilter
            column={table.getColumn('status')!}
            title='Trạng thái'
            options={STATUS_FILTER_OPTIONS}
          />
        </DataTableToolbar>
      </DataTable>

      {canEdit && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle>Khởi tạo quy trình Onboarding</DialogTitle>
              <DialogDescription>
                Chọn nhân viên và mẫu checklist hội nhập để tạo quy trình mới.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4 py-2'>
              <div className='space-y-1.5'>
                <Label htmlFor='onboarding-employee'>Nhân viên *</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger id='onboarding-employee'>
                    <SelectValue placeholder='Chọn nhân viên' />
                  </SelectTrigger>
                  <SelectContent>
                    {(employeesData?.employees ?? []).map((emp) => {
                      const fullName = [emp.lastName, emp.firstName].filter(Boolean).join(' ');
                      return (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.employeeCode ? `${fullName} (${emp.employeeCode})` : fullName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='onboarding-template'>Mẫu quy trình (Template) *</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger id='onboarding-template'>
                    <SelectValue placeholder='Chọn mẫu checklist hội nhập' />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='onboarding-join-date'>Ngày bắt đầu hội nhập (tùy chọn)</Label>
                <Input
                  id='onboarding-join-date'
                  type='date'
                  value={joinDate}
                  onChange={(e) => setJoinDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setCreateOpen(false)}>
                Hủy
              </Button>
              <Button
                onClick={handleCreateSubmit}
                disabled={
                  !selectedEmployeeId || !selectedTemplateId || createProcessMutation.isPending
                }
              >
                {createProcessMutation.isPending ? 'Đang khởi tạo...' : 'Khởi tạo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
