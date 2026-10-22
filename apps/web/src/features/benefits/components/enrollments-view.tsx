'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryStates, parseAsString } from 'nuqs';
import { benefitEnrollmentsQueryOptions, benefitPlansQueryOptions } from '../api/queries';
import {
  useApproveEnrollment,
  useCancelEnrollment,
  useEnrollEmployee,
  useAddDependent,
} from '../api/mutations';
import type { BenefitEnrollmentListFilters } from '../queries/benefit-queries';
import { employeesQueryOptions } from '@/features/employees';
import { extractList, extractPagination } from '@/lib/api-extract';
import {
  ENROLLMENT_STATUS_MAP,
  type BenefitEnrollmentRow,
  type BenefitPlanRow,
} from './status-maps';
import { StatusBadge } from '@/components/ui/status-badge';
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
import { formatDateVN } from '@/lib/date';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from '@/components/ui/table/data-table-pagination';
import { AppEmptyState } from '@/components/ui/app-empty-state';
import { QueryErrorAlert } from '@/components/errors/query-error-alert';
import { Icons } from '@/components/icons';
import { benefitsUiCopy, commonUiCopy } from '@/locales/vi/app-copy';
import { pageParser } from '@/lib/pagination';
import { enrollEmployeeSchema } from '../schemas/benefit.schema';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyPermission } from '@project/permissions';
import { permissions } from '@/lib/permissions';

const copy = benefitsUiCopy.enrollments;

const COVERAGE_LABELS: Record<string, string> = {
  employee_only: 'Cá nhân nhân viên',
  employee_plus_one: 'Nhân viên + 1 người phụ thuộc',
  family: 'Gia đình',
};

export function BenefitEnrollmentsView() {
  const user = useAuthStore((s) => s.user);
  const userPermissions = user?.permissions ?? [];
  const canManage = Boolean(
    user?.isSuperAdmin ||
      userPermissions.includes('ALL') ||
      userPermissions.includes('sys:all') ||
      hasAnyPermission(userPermissions, [permissions.benefits.manage]),
  );

  const [params, setParams] = useQueryStates({
    page: pageParser,
    status: parseAsString,
  });

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState<{
    planId: string;
    employeeId: string;
    coverageType: 'employee_only' | 'employee_plus_one' | 'family';
    effectiveFrom: string;
  }>({
    planId: '',
    employeeId: user?.employeeId ?? '',
    coverageType: 'employee_only',
    effectiveFrom: '',
  });

  const filters: BenefitEnrollmentListFilters = {
    page: params.page,
    limit: 20,
    ...(params.status ? { status: params.status } : {}),
  };

  const { data, error, isLoading, refetch } = useQuery(
    benefitEnrollmentsQueryOptions(filters),
  );
  const { data: plansData } = useQuery(benefitPlansQueryOptions({ page: 1, limit: 200 }));
  const { data: employeesData } = useQuery(employeesQueryOptions({ page: 1, limit: 200 }));

  const plans = extractList<BenefitPlanRow>(plansData);
  const publishedPlans = useMemo(
    () => plans.filter((p) => p.status === 'published'),
    [plans],
  );

  const planMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of plans) {
      if (p.id && p.name) map.set(p.id, p.name);
    }
    return map;
  }, [plans]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const emp of employeesData?.employees ?? []) {
      const fullName = [emp.lastName, emp.firstName].filter(Boolean).join(' ');
      map.set(emp.id, emp.employeeCode ? `${fullName} (${emp.employeeCode})` : fullName);
    }
    return map;
  }, [employeesData]);

  const allRows = extractList<BenefitEnrollmentRow>(data);
  const rows = useMemo(
    () =>
      params.status
        ? allRows.filter((r) => r.status === params.status)
        : allRows,
    [allRows, params.status],
  );
  const pagination = extractPagination(data);

  const enrollMutation = useEnrollEmployee();
  const approveEnrollment = useApproveEnrollment();
  const cancelEnrollment = useCancelEnrollment();
  const addDependentMutation = useAddDependent();

  const [dependentEnrollmentId, setDependentEnrollmentId] = useState<string | null>(null);
  const [depForm, setDepForm] = useState({
    fullName: '',
    relationship: 'Vợ/Chồng',
    dateOfBirth: '',
  });

  const handleAddDependent = async () => {
    if (!dependentEnrollmentId || !depForm.fullName.trim() || !depForm.relationship.trim()) {
      return;
    }
    await addDependentMutation.mutateAsync({
      enrollmentId: dependentEnrollmentId,
      fullName: depForm.fullName.trim(),
      relationship: depForm.relationship.trim(),
      ...(depForm.dateOfBirth ? { dateOfBirth: depForm.dateOfBirth } : {}),
    });
    setDependentEnrollmentId(null);
    setDepForm({ fullName: '', relationship: 'Vợ/Chồng', dateOfBirth: '' });
  };

  const handleEnrollSubmit = async () => {
    const parsed = enrollEmployeeSchema.safeParse({
      planId: enrollForm.planId,
      employeeId: enrollForm.employeeId,
      coverageType: enrollForm.coverageType,
      ...(enrollForm.effectiveFrom ? { effectiveFrom: enrollForm.effectiveFrom } : {}),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Vui lòng kiểm tra lại thông tin đăng ký');
      return;
    }
    await enrollMutation.mutateAsync(parsed.data);
    setEnrollOpen(false);
    setEnrollForm({
      planId: '',
      employeeId: user?.employeeId ?? '',
      coverageType: 'employee_only',
      effectiveFrom: '',
    });
  };

  if (error && !isLoading) {
    return (
      <QueryErrorAlert
        error={error}
        subject={copy.title}
        onRetry={() => void refetch()}
        className='rounded-lg border-destructive/50 bg-destructive/5'
      />
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <Select
            value={params.status ?? 'all'}
            onValueChange={(val) =>
              void setParams({ status: val === 'all' ? null : val, page: 1 })
            }
          >
            <SelectTrigger className='h-9 w-[180px]'>
              <SelectValue placeholder='Tất cả trạng thái' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Tất cả trạng thái</SelectItem>
              <SelectItem value='pending'>{benefitsUiCopy.enrollmentStatus.pending}</SelectItem>
              <SelectItem value='approved'>{benefitsUiCopy.enrollmentStatus.approved}</SelectItem>
              <SelectItem value='active'>{benefitsUiCopy.enrollmentStatus.active}</SelectItem>
              <SelectItem value='cancelled'>{benefitsUiCopy.enrollmentStatus.cancelled}</SelectItem>
              <SelectItem value='terminated'>{benefitsUiCopy.enrollmentStatus.terminated}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          size='sm'
          onClick={() => {
            setEnrollForm((prev) => ({
              ...prev,
              employeeId: prev.employeeId || user?.employeeId || '',
            }));
            setEnrollOpen(true);
          }}
        >
          <Icons.add className='mr-1.5 size-4' />
          Đăng ký phúc lợi
        </Button>
      </div>

      {rows.length === 0 && !isLoading ? (
        <AppEmptyState
          icon={<Icons.page className='size-10' />}
          title={copy.empty}
          compact
        />
      ) : (
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.columns.employeeName}</TableHead>
                <TableHead>{copy.columns.planName}</TableHead>
                <TableHead>{copy.columns.status}</TableHead>
                <TableHead>{copy.columns.coverageType}</TableHead>
                <TableHead>{copy.columns.effectiveFrom}</TableHead>
                <TableHead>{copy.columns.enrolledAt}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const empLabel =
                  row.employeeName ??
                  (row.employeeId ? employeeMap.get(row.employeeId) : undefined) ??
                  row.employeeId?.slice(0, 8) ??
                  '—';
                const planLabel =
                  row.planName ??
                  (row.planId ? planMap.get(row.planId) : undefined) ??
                  row.planId?.slice(0, 8) ??
                  '—';
                return (
                  <TableRow key={row.id}>
                    <TableCell className='font-medium'>{empLabel}</TableCell>
                    <TableCell>{planLabel}</TableCell>
                    <TableCell>
                      <StatusBadge mapping={ENROLLMENT_STATUS_MAP} status={row.status ?? 'pending'} />
                    </TableCell>
                    <TableCell>
                      {row.coverageType
                        ? (COVERAGE_LABELS[row.coverageType] ?? row.coverageType)
                        : '—'}
                    </TableCell>
                    <TableCell>{row.effectiveFrom ? formatDateVN(row.effectiveFrom) : '—'}</TableCell>
                    <TableCell>{row.enrolledAt ? formatDateVN(row.enrolledAt) : '—'}</TableCell>
                    <TableCell>
                      <div className='flex justify-end gap-1'>
                        {row.coverageType !== 'employee_only' && (
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => setDependentEnrollmentId(row.id)}
                          >
                            + Người phụ thuộc
                          </Button>
                        )}
                        {canManage ? (
                          <>
                            {row.status === 'pending' ? (
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => approveEnrollment.mutate({ id: row.id })}
                                disabled={approveEnrollment.isPending}
                              >
                                Duyệt
                              </Button>
                            ) : null}
                            {row.status === 'pending' || row.status === 'approved' ? (
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => cancelEnrollment.mutate({ id: row.id })}
                                disabled={cancelEnrollment.isPending}
                              >
                                Hủy
                              </Button>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination && pagination.total > filters.limit! ? (
        <DataTablePagination
          page={params.page}
          pageCount={Math.ceil(pagination.total / (filters.limit || 20))}
          pageSize={filters.limit || 20}
          total={pagination.total}
          onPageChange={(page) => void setParams({ page })}
        />
      ) : null}

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Đăng ký gói phúc lợi</DialogTitle>
            <DialogDescription>
              Chọn nhân viên và gói phúc lợi đang mở đăng ký (Published).
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-2'>
            <div className='grid gap-1.5'>
              <Label>Nhân viên *</Label>
              <Select
                value={enrollForm.employeeId}
                onValueChange={(v) => setEnrollForm({ ...enrollForm, employeeId: v })}
              >
                <SelectTrigger>
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
            <div className='grid gap-1.5'>
              <Label>Gói phúc lợi *</Label>
              <Select
                value={enrollForm.planId}
                onValueChange={(v) => setEnrollForm({ ...enrollForm, planId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Chọn gói phúc lợi đã công bố' />
                </SelectTrigger>
                <SelectContent>
                  {publishedPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-1.5'>
              <Label>Phạm vi bảo hiểm / phúc lợi *</Label>
              <Select
                value={enrollForm.coverageType}
                onValueChange={(v) =>
                  setEnrollForm({
                    ...enrollForm,
                    coverageType: v as 'employee_only' | 'employee_plus_one' | 'family',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='employee_only'>{COVERAGE_LABELS.employee_only}</SelectItem>
                  <SelectItem value='employee_plus_one'>
                    {COVERAGE_LABELS.employee_plus_one}
                  </SelectItem>
                  <SelectItem value='family'>{COVERAGE_LABELS.family}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-1.5'>
              <Label>Ngày hiệu lực (tùy chọn)</Label>
              <Input
                type='date'
                value={enrollForm.effectiveFrom}
                onChange={(e) =>
                  setEnrollForm({ ...enrollForm, effectiveFrom: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEnrollOpen(false)}>
              {commonUiCopy.cancel}
            </Button>
            <Button
              onClick={() => void handleEnrollSubmit()}
              disabled={
                !enrollForm.planId || !enrollForm.employeeId || enrollMutation.isPending
              }
            >
              {enrollMutation.isPending ? 'Đang đăng ký...' : 'Đăng ký'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(dependentEnrollmentId)}
        onOpenChange={(v) => !v && setDependentEnrollmentId(null)}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Thêm người phụ thuộc</DialogTitle>
            <DialogDescription>
              Đăng ký thông tin người thân đi kèm gói phúc lợi bảo hiểm.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-2'>
            <div className='grid gap-1.5'>
              <Label htmlFor='dep-fullname'>Họ và tên người phụ thuộc *</Label>
              <Input
                id='dep-fullname'
                value={depForm.fullName}
                onChange={(e) => setDepForm({ ...depForm, fullName: e.target.value })}
                placeholder='Nguyễn Thị B'
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='grid gap-1.5'>
                <Label htmlFor='dep-rel'>Mối quan hệ *</Label>
                <Input
                  id='dep-rel'
                  value={depForm.relationship}
                  onChange={(e) =>
                    setDepForm({ ...depForm, relationship: e.target.value })
                  }
                  placeholder='Vợ/Chồng, Con...'
                />
              </div>
              <div className='grid gap-1.5'>
                <Label htmlFor='dep-dob'>Ngày sinh</Label>
                <Input
                  id='dep-dob'
                  type='date'
                  value={depForm.dateOfBirth}
                  onChange={(e) =>
                    setDepForm({ ...depForm, dateOfBirth: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDependentEnrollmentId(null)}>
              {commonUiCopy.cancel}
            </Button>
            <Button
              onClick={() => void handleAddDependent()}
              disabled={
                !depForm.fullName.trim() ||
                !depForm.relationship.trim() ||
                addDependentMutation.isPending
              }
            >
              {commonUiCopy.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
