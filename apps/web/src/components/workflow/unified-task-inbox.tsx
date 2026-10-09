'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { formatDateVN } from '@/lib/date';
import { extractList } from '@/lib/api-extract';
import { WorkflowStateBadge } from './workflow-state-badge';

// Unified Backend Workflow Task Query
import { useMyWorkflowTasks } from '@/features/workflow/queries/workflow-tasks';

// API queries & mutations across domains
import { useApprovalInboxControllerList } from '@/api/generated/approval-inbox/approval-inbox';
import { useApproveLeaveInboxRequest, useRejectLeaveInboxRequest } from '@/features/leave/api/mutations';
import { expenseClaimsQueryOptions } from '@/features/expenses/api/queries';
import { useApproveExpenseClaim, useRejectExpenseClaim } from '@/features/expenses/api/mutations';
import { requestsQueryOptions } from '@/features/asset-management/api/queries';
import { useAllRequests, useApproveRequest, useDenyRequest } from '@/features/shifts/api/request-queries';
import { usePayrollRunsQuery } from '@/features/payroll/queries/payroll-run-queries';
import { useExceptionsQuery } from '@/features/attendance/api/timekeeping-queries';
import { useOffboardingList } from '@/features/offboarding/queries';

export type TaskDomain =
  | 'all'
  | 'leave'
  | 'expense'
  | 'asset'
  | 'schedule'
  | 'payroll'
  | 'attendance'
  | 'offboarding';

export interface UnifiedTask {
  id: string;
  domain: TaskDomain;
  domainLabel: string;
  domainIcon: React.ReactNode;
  workflowId: string;
  title: string;
  subtitle: string;
  requesterName: string;
  currentState: string;
  currentStateLabel: string;
  currentStateVariant: 'default' | 'secondary' | 'destructive' | 'outline' | 'amber' | 'emerald' | 'blue';
  requiredAction: string;
  priority: 'urgent' | 'high' | 'normal';
  createdAt?: string;
  dateRange?: string;
  detailUrl: string;
  // 1-click execution bindings
  canDirectApprove?: boolean;
  canDirectReject?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  isActionPending?: boolean;
}

export function UnifiedTaskInbox() {
  const queryClient = useQueryClient();
  const [activeDomain, setActiveDomain] = React.useState<TaskDomain>('all');

  // Backend Platform Unified Workflow Tasks Query
  const { data: serverTasksData } = useMyWorkflowTasks(activeDomain);

  // 1. Leave Requests
  const { data: leaveInboxData, isLoading: leaveLoading } = useApprovalInboxControllerList();
  const leaveItems = extractList<any>(leaveInboxData);
  const approveLeaveMut = useApproveLeaveInboxRequest();
  const rejectLeaveMut = useRejectLeaveInboxRequest();

  // 2. Expense Claims (submitted)
  const { data: claimsData } = useQuery(expenseClaimsQueryOptions({ limit: 20 }));
  const claimItems = (extractList<any>(claimsData) || []).filter(
    (c: any) => c.status === 'submitted',
  );
  const approveClaimMut = useApproveExpenseClaim();
  const rejectClaimMut = useRejectExpenseClaim();

  // 3. Asset Requests (pending_approval or approved awaiting fulfillment)
  const { data: assetRequestsData } = useQuery(requestsQueryOptions({ limit: 20 }));
  const assetItems = (extractList<any>(assetRequestsData) || []).filter(
    (a: any) => a.status === 'pending_approval' || a.status === 'approved',
  );

  // 4. Schedule Requests (pending)
  const scheduleRequestsQuery = useAllRequests({ status: 'pending' });
  const scheduleItems = scheduleRequestsQuery.data ?? [];
  const approveScheduleMut = useApproveRequest();
  const denyScheduleMut = useDenyRequest();

  // 5. Payroll Runs (processing or approved)
  const { data: payrollData } = usePayrollRunsQuery({ limit: 10 });
  const payrollItems = (payrollData?.rows ?? []).filter(
    (r: any) => r.status === 'processing' || r.status === 'approved',
  );

  // 6. Attendance Exceptions (pending)
  const { data: exceptionsData } = useExceptionsQuery({ limit: 10 });
  const exceptionItems = (exceptionsData?.records ?? []).filter(
    (e: any) => e.status === 'pending',
  );

  // 7. Offboarding Processes (in_progress)
  const { data: offboardingData } = useOffboardingList(1, 10);
  const offboardingItems = (offboardingData?.rows ?? []).filter(
    (o: any) => o.status === 'in_progress',
  );

  // Transform all domain records into UnifiedTask standard
  const allTasks: UnifiedTask[] = React.useMemo(() => {
    const list: UnifiedTask[] = [];

    // Map Leave items
    leaveItems.forEach((l: any) => {
      list.push({
        id: `leave-${l.leaveRequestId || l.approvalRequestId}`,
        domain: 'leave',
        domainLabel: 'Nghỉ phép',
        domainIcon: <Icons.calendar className='size-3.5 text-blue-600' />,
        workflowId: 'leave-request',
        title: `${l.requester?.fullName || 'Nhân viên'} xin ${l.leaveType?.name || 'nghỉ phép'}`,
        subtitle: `${l.totalUnits ?? 1} ngày • ${l.reason || 'Không có lý do'}`,
        requesterName: l.requester?.fullName || 'Nhân viên',
        currentState: 'pending',
        currentStateLabel: 'Chờ duyệt',
        currentStateVariant: 'amber',
        requiredAction: 'Quản lý trực tiếp phê duyệt nghỉ',
        priority: 'high',
        createdAt: l.createdAt,
        dateRange: `${l.startDate ? formatDateVN(l.startDate) : ''} → ${l.endDate ? formatDateVN(l.endDate) : ''}`,
        detailUrl: '/leave',
        canDirectApprove: true,
        canDirectReject: true,
        onApprove: () =>
          approveLeaveMut.mutate({
            id: l.leaveRequestId,
            data: { comment: 'Duyệt từ Task Inbox' },
          }),
        onReject: () =>
          rejectLeaveMut.mutate({
            id: l.leaveRequestId,
            data: { comment: 'Từ chối từ Task Inbox' },
          }),
        isActionPending: approveLeaveMut.isPending || rejectLeaveMut.isPending,
      });
    });

    // Map Expense items
    claimItems.forEach((c: any) => {
      list.push({
        id: `expense-${c.id}`,
        domain: 'expense',
        domainLabel: 'Chi phí',
        domainIcon: <Icons.billing className='size-3.5 text-amber-600' />,
        workflowId: 'expense-claim',
        title: `Đề nghị thanh toán #${c.id.slice(0, 8)}`,
        subtitle: `${c.amount ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(c.amount) : '0 ₫'} • ${c.description || 'Chi tiêu công tác'}`,
        requesterName: c.employeeName || c.employeeId || 'Nhân viên',
        currentState: 'submitted',
        currentStateLabel: 'Chờ duyệt chi',
        currentStateVariant: 'amber',
        requiredAction: 'Quản lý / Kế toán duyệt khoản chi',
        priority: 'high',
        createdAt: c.createdAt,
        detailUrl: '/expenses',
        canDirectApprove: true,
        canDirectReject: true,
        onApprove: () => approveClaimMut.mutate({ id: c.id }),
        onReject: () => rejectClaimMut.mutate({ id: c.id, reason: 'Từ chối từ Task Inbox' }),
        isActionPending: approveClaimMut.isPending || rejectClaimMut.isPending,
      });
    });

    // Map Asset items
    assetItems.forEach((a: any) => {
      const isApproved = a.status === 'approved';
      list.push({
        id: `asset-${a.id}`,
        domain: 'asset',
        domainLabel: 'Thiết bị',
        domainIcon: <Icons.laptop className='size-3.5 text-indigo-600' />,
        workflowId: 'asset-request',
        title: `Yêu cầu cấp phát thiết bị #${a.id.slice(0, 8)}`,
        subtitle: a.reason || 'Trang thiết bị làm việc',
        requesterName: a.requesterEmployeeId || 'Nhân viên',
        currentState: a.status,
        currentStateLabel: isApproved ? 'Chờ xuất kho' : 'Chờ phê duyệt',
        currentStateVariant: isApproved ? 'blue' : 'amber',
        requiredAction: isApproved ? 'IT xuất kho & bàn giao' : 'Quản lý duyệt đề xuất',
        priority: isApproved ? 'normal' : 'high',
        createdAt: a.createdAt,
        detailUrl: '/asset-management/requests',
      });
    });

    // Map Schedule items
    scheduleItems.forEach((s: any) => {
      list.push({
        id: `schedule-${s.id}`,
        domain: 'schedule',
        domainLabel: 'Đổi ca',
        domainIcon: <Icons.activity className='size-3.5 text-emerald-600' />,
        workflowId: 'schedule-request',
        title: `${s.employeeName} đề xuất đổi/nghỉ ca`,
        subtitle: `Ngày: ${formatDateVN(s.date)} • ${s.reason || 'Lý do cá nhân'}`,
        requesterName: s.employeeName,
        currentState: 'pending',
        currentStateLabel: 'Chờ duyệt ca',
        currentStateVariant: 'amber',
        requiredAction: 'Quản lý ca kiểm tra độ phủ & duyệt',
        priority: 'high',
        dateRange: formatDateVN(s.date),
        detailUrl: '/schedule/requests',
        canDirectApprove: true,
        canDirectReject: true,
        onApprove: () => approveScheduleMut.mutate(s.id),
        onReject: () => denyScheduleMut.mutate(s.id),
        isActionPending: approveScheduleMut.isPending || denyScheduleMut.isPending,
      });
    });

    // Map Payroll items
    payrollItems.forEach((p: any) => {
      const isProcessing = p.status === 'processing';
      list.push({
        id: `payroll-${p.id}`,
        domain: 'payroll',
        domainLabel: 'Bảng lương',
        domainIcon: <Icons.creditCard className='size-3.5 text-rose-600' />,
        workflowId: 'payroll-run',
        title: `Kỳ tính lương #${p.id.slice(0, 8)}`,
        subtitle: `Trạng thái: ${p.status} • Cần thẩm định tổng quỹ lương`,
        requesterName: 'Phòng Kế toán & Tiền lương',
        currentState: p.status,
        currentStateLabel: isProcessing ? 'Chờ phê duyệt lương' : 'Sẵn sàng hạch toán',
        currentStateVariant: isProcessing ? 'amber' : 'emerald',
        requiredAction: isProcessing ? 'Ban Giám đốc / CFO phê duyệt chi trả' : 'Kế toán trưởng hạch toán',
        priority: 'urgent',
        createdAt: p.createdAt,
        detailUrl: `/payroll/runs/${p.id}`,
      });
    });

    // Map Attendance Exception items
    exceptionItems.forEach((e: any) => {
      list.push({
        id: `attendance-${e.id}`,
        domain: 'attendance',
        domainLabel: 'Chấm công',
        domainIcon: <Icons.clock className='size-3.5 text-amber-600' />,
        workflowId: 'attendance-period',
        title: `Ngoại lệ chấm công: ${e.employeeName || 'Nhân viên'}`,
        subtitle: `${e.type || 'Bất thường'} • Ngày: ${formatDateVN(e.date || e.workDate)}`,
        requesterName: e.employeeName || 'Nhân viên',
        currentState: 'pending',
        currentStateLabel: 'Cần giải trình',
        currentStateVariant: 'amber',
        requiredAction: 'Xác nhận giải trình & cập nhật công',
        priority: 'normal',
        detailUrl: '/attendance',
      });
    });

    // Map Offboarding items
    offboardingItems.forEach((o: any) => {
      list.push({
        id: `offboarding-${o.id}`,
        domain: 'offboarding',
        domainLabel: 'Thôi việc',
        domainIcon: <Icons.userOff className='size-3.5 text-rose-600' />,
        workflowId: 'offboarding-clearance',
        title: `Bàn giao thôi việc: #${o.id.slice(0, 8)}`,
        subtitle: `Bắt đầu: ${o.startDate ? formatDateVN(o.startDate) : 'N/A'} • Chờ hoàn tất clearance & bàn giao`,
        requesterName: `Nhân viên #${o.employeeId?.slice(0, 8)}`,
        currentState: o.status,
        currentStateLabel: 'Đang xử lý',
        currentStateVariant: 'amber',
        requiredAction: 'HR & Trưởng bộ phận duyệt clearance',
        priority: 'high',
        createdAt: o.startDate,
        detailUrl: '/offboarding',
      });
    });

    return list;
  }, [
    leaveItems,
    claimItems,
    assetItems,
    scheduleItems,
    payrollItems,
    exceptionItems,
    offboardingItems,
    approveLeaveMut,
    rejectLeaveMut,
    approveClaimMut,
    rejectClaimMut,
    approveScheduleMut,
    denyScheduleMut,
  ]);

  // Map server-provided tasks when available
  const tasksFromServer: UnifiedTask[] | null = React.useMemo(() => {
    if (!serverTasksData?.tasks) return null;

    const domainIcons: Record<string, React.ReactNode> = {
      leave: <Icons.calendar className='size-3.5 text-blue-600' />,
      expense: <Icons.billing className='size-3.5 text-amber-600' />,
      asset: <Icons.laptop className='size-3.5 text-indigo-600' />,
      schedule: <Icons.activity className='size-3.5 text-emerald-600' />,
      payroll: <Icons.creditCard className='size-3.5 text-rose-600' />,
      attendance: <Icons.clock className='size-3.5 text-amber-600' />,
      offboarding: <Icons.userOff className='size-3.5 text-rose-600' />,
    };

    return serverTasksData.tasks.map((t) => {
      let onApprove: (() => void) | undefined;
      let onReject: (() => void) | undefined;
      let isActionPending = false;

      if (t.domain === 'leave') {
        onApprove = () =>
          approveLeaveMut.mutate(
            { id: t.entityId, data: { comment: 'Duyệt từ Task Inbox' } },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['workflow', 'tasks'] });
                queryClient.invalidateQueries({ queryKey: ['leave'] });
              },
            },
          );
        onReject = () =>
          rejectLeaveMut.mutate(
            { id: t.entityId, data: { comment: 'Từ chối từ Task Inbox' } },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['workflow', 'tasks'] });
                queryClient.invalidateQueries({ queryKey: ['leave'] });
              },
            },
          );
        isActionPending = approveLeaveMut.isPending || rejectLeaveMut.isPending;
      } else if (t.domain === 'expense') {
        onApprove = () =>
          approveClaimMut.mutate(
            { id: t.entityId },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['workflow', 'tasks'] });
                queryClient.invalidateQueries({ queryKey: ['expenses'] });
              },
            },
          );
        onReject = () =>
          rejectClaimMut.mutate(
            { id: t.entityId, reason: 'Từ chối từ Task Inbox' },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['workflow', 'tasks'] });
                queryClient.invalidateQueries({ queryKey: ['expenses'] });
              },
            },
          );
        isActionPending = approveClaimMut.isPending || rejectClaimMut.isPending;
      } else if (t.domain === 'schedule') {
        onApprove = () =>
          approveScheduleMut.mutate(t.entityId, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['workflow', 'tasks'] });
              queryClient.invalidateQueries({ queryKey: ['shifts'] });
            },
          });
        onReject = () =>
          denyScheduleMut.mutate(t.entityId, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['workflow', 'tasks'] });
              queryClient.invalidateQueries({ queryKey: ['shifts'] });
            },
          });
        isActionPending = approveScheduleMut.isPending || denyScheduleMut.isPending;
      }

      return {
        ...t,
        domain: t.domain as TaskDomain,
        domainIcon: domainIcons[t.domain] ?? <Icons.check className='size-3.5 text-primary' />,
        onApprove,
        onReject,
        isActionPending,
      };
    });
  }, [
    serverTasksData,
    approveLeaveMut,
    rejectLeaveMut,
    approveClaimMut,
    rejectClaimMut,
    approveScheduleMut,
    denyScheduleMut,
    queryClient,
  ]);

  const countsByDomain = React.useMemo(() => {
    if (serverTasksData?.countsByDomain) {
      return {
        all: serverTasksData.countsByDomain.all ?? 0,
        leave: serverTasksData.countsByDomain.leave ?? 0,
        expense: serverTasksData.countsByDomain.expense ?? 0,
        asset: serverTasksData.countsByDomain.asset ?? 0,
        schedule: serverTasksData.countsByDomain.schedule ?? 0,
        payroll: serverTasksData.countsByDomain.payroll ?? 0,
        attendance: serverTasksData.countsByDomain.attendance ?? 0,
        offboarding: serverTasksData.countsByDomain.offboarding ?? 0,
      };
    }
    return {
      all: allTasks.length,
      leave: allTasks.filter((t) => t.domain === 'leave').length,
      expense: allTasks.filter((t) => t.domain === 'expense').length,
      asset: allTasks.filter((t) => t.domain === 'asset').length,
      schedule: allTasks.filter((t) => t.domain === 'schedule').length,
      payroll: allTasks.filter((t) => t.domain === 'payroll').length,
      attendance: allTasks.filter((t) => t.domain === 'attendance').length,
      offboarding: allTasks.filter((t) => t.domain === 'offboarding').length,
    };
  }, [serverTasksData, allTasks]);

  const filteredTasks = React.useMemo(() => {
    if (tasksFromServer) return tasksFromServer;
    if (activeDomain === 'all') return allTasks;
    return allTasks.filter((t) => t.domain === activeDomain);
  }, [tasksFromServer, allTasks, activeDomain]);

  return (
    <Card className='border-primary/20 shadow-xs'>
      <CardHeader className='pb-3'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-2'>
            <div className='flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Icons.check className='size-4' />
            </div>
            <div>
              <CardTitle className='text-base font-bold text-foreground'>
                Hộp việc tập trung (Platform Task Inbox)
              </CardTitle>
              <p className='text-xs text-muted-foreground'>
                Tổng hợp nhiệm vụ cần xử lý xuyên suốt 7 luồng nghiệp vụ HRMS.
              </p>
            </div>
          </div>
          <Badge
            variant='outline'
            className='self-start sm:self-auto border-amber-300 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-bold px-2.5 py-0.5'
          >
            {allTasks.length} nhiệm vụ chờ xử lý
          </Badge>
        </div>

        {/* Domain Filter Pills */}
        <div className='flex flex-wrap gap-1.5 pt-3'>
          {[
            { id: 'all', label: 'Tất cả', count: countsByDomain.all },
            { id: 'leave', label: 'Nghỉ phép', count: countsByDomain.leave },
            { id: 'expense', label: 'Chi phí', count: countsByDomain.expense },
            { id: 'asset', label: 'Thiết bị', count: countsByDomain.asset },
            { id: 'schedule', label: 'Lịch ca', count: countsByDomain.schedule },
            { id: 'payroll', label: 'Lương', count: countsByDomain.payroll },
            { id: 'attendance', label: 'Chấm công', count: countsByDomain.attendance },
            { id: 'offboarding', label: 'Thôi việc', count: countsByDomain.offboarding },
          ].map((pill) => {
            const isActive = activeDomain === pill.id;
            return (
              <Button
                key={pill.id}
                variant={isActive ? 'default' : 'outline'}
                size='sm'
                className={`h-7 px-2.5 text-xs font-medium gap-1.5 transition-all ${
                  !isActive ? 'bg-background hover:bg-muted/50' : ''
                }`}
                onClick={() => setActiveDomain(pill.id as TaskDomain)}
              >
                <span>{pill.label}</span>
                {pill.count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isActive
                        ? 'bg-primary-foreground text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {pill.count}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className='pt-1'>
        {leaveLoading && allTasks.length === 0 ? (
          <div className='flex items-center justify-center py-10 text-muted-foreground text-xs'>
            <Icons.spinner className='size-5 animate-spin mr-2' />
            Đang tải danh sách nhiệm vụ...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className='flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center text-muted-foreground'>
            <div className='flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-2'>
              <Icons.check className='size-6' />
            </div>
            <p className='text-sm font-semibold text-foreground'>
              Không có nhiệm vụ nào cần giải quyết!
            </p>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Tất cả đề xuất trong danh mục này đã được xử lý hoàn tất.
            </p>
          </div>
        ) : (
          <div className='space-y-3'>
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className='flex flex-col gap-3 rounded-lg border border-border bg-card p-3.5 hover:border-primary/40 hover:shadow-xs transition-all sm:flex-row sm:items-center sm:justify-between'
              >
                {/* Task Details */}
                <div className='space-y-1.5 flex-1 min-w-0'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Badge variant='outline' className='text-[10px] gap-1 font-semibold bg-muted/40'>
                      {task.domainIcon}
                      <span>{task.domainLabel}</span>
                    </Badge>
                    <WorkflowStateBadge
                      variant={task.currentStateVariant}
                      label={task.currentStateLabel}
                      isPulsing={task.priority === 'urgent'}
                    />
                    {task.priority === 'urgent' && (
                      <Badge variant='destructive' className='text-[9px] uppercase font-bold py-0'>
                        Khẩn cấp
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h4 className='text-sm font-semibold text-foreground truncate'>
                      {task.title}
                    </h4>
                    <p className='text-xs text-muted-foreground line-clamp-1'>
                      {task.subtitle}
                    </p>
                  </div>

                  <div className='flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5'>
                    <span>Người yêu cầu: <strong className='text-foreground font-medium'>{task.requesterName}</strong></span>
                    {task.dateRange && <span>Thời gian: {task.dateRange}</span>}
                    <span className='text-amber-700 dark:text-amber-400 font-medium'>
                      Hành động: {task.requiredAction}
                    </span>
                  </div>
                </div>

                {/* Actions & Deep Link */}
                <div className='flex items-center gap-2 self-end sm:self-center shrink-0'>
                  {task.canDirectApprove && task.onApprove && (
                    <Button
                      size='sm'
                      className='h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white'
                      onClick={task.onApprove}
                      disabled={task.isActionPending}
                    >
                      {task.isActionPending ? (
                        <Icons.spinner className='size-3.5 animate-spin mr-1' />
                      ) : (
                        <Icons.check className='size-3.5 mr-1' />
                      )}
                      Duyệt ngay
                    </Button>
                  )}
                  {task.canDirectReject && task.onReject && (
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-8 text-xs text-destructive hover:bg-destructive/10'
                      onClick={task.onReject}
                      disabled={task.isActionPending}
                    >
                      <Icons.circleX className='size-3.5 mr-1' />
                      Từ chối
                    </Button>
                  )}
                  <Button variant='outline' size='sm' asChild className='h-8 text-xs'>
                    <Link href={task.detailUrl}>
                      <Icons.eye className='size-3.5 mr-1' />
                      Chi tiết luồng
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
