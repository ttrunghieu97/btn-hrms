'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { EmployeeResponseDto } from '@/api/generated/model';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { EmployeeStatusBadge } from '../display/employee-status-badge';
import { formatDateVN } from '@/lib/date';
import { getEmployeeName } from '../../utils/employee-display';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyPermission } from '@project/permissions';
import { approval, permissions } from '@/lib/permissions';
import { ApiError } from '@/lib/api-error';
import { getVietnameseApiErrorMessage } from '@/lib/api-error-message';
import {
  useApproveTransferMutation,
  useApplyTransferMutation,
  useCancelScheduledTerminationMutation,
  useCancelTransferMutation,
  useDepartmentsQuery,
  useEmployeeBoardingStatusQuery,
  useEmployeeWorkflowInstancesQuery,
  useRejectTransferMutation,
} from '../../queries/employee-queries';
import { ChangeEmployeeStatusDialog, type LifecycleStatus } from '../dialogs/lifecycle/change-employee-status-dialog';
import { TerminateEmployeeDialog } from '../dialogs/lifecycle/terminate-employee-dialog';
import { RehireEmployeeDialog } from '../dialogs/lifecycle/rehire-employee-dialog';
import { RequestTransferDialog } from '../dialogs/lifecycle/request-transfer-dialog';

interface EmployeeLifecycleWorkflowHeroProps {
  employee: EmployeeResponseDto;
  onEditClick?: () => void;
  isEditing?: boolean;
}

interface WorkflowStep {
  id: string;
  number: number;
  label: string;
  sublabel: string;
  status: 'completed' | 'current' | 'upcoming';
}

function getWorkflowSteps(currentStatus: string): WorkflowStep[] {
  const isProbation = currentStatus === 'probation';
  const isWorking = currentStatus === 'working';
  const isSuspendedOrLeave = currentStatus === 'leave' || currentStatus === 'suspended';
  const isTerminatedOrRetired = currentStatus === 'terminated' || currentStatus === 'retired';

  return [
    {
      id: 'onboarding',
      number: 1,
      label: 'Tiếp nhận & Hồ sơ',
      sublabel: 'Tạo hồ sơ nhân viên',
      status: 'completed',
    },
    {
      id: 'probation',
      number: 2,
      label: 'Thử việc',
      sublabel: isProbation ? 'Đang đánh giá thử việc' : 'Hoàn thành thử việc',
      status: isProbation ? 'current' : 'completed',
    },
    {
      id: 'working',
      number: 3,
      label: 'Chính thức',
      sublabel: isWorking
        ? 'Đang làm việc chính thức'
        : isSuspendedOrLeave
          ? currentStatus === 'leave'
            ? 'Tạm hoãn hợp đồng'
            : 'Tạm đình chỉ công tác'
          : isTerminatedOrRetired
            ? 'Đã qua giai đoạn chính thức'
            : 'Chờ xét duyệt chính thức',
      status: isWorking || isSuspendedOrLeave ? 'current' : isTerminatedOrRetired ? 'completed' : 'upcoming',
    },
    {
      id: 'separation',
      number: 4,
      label: 'Kết thúc vòng đời',
      sublabel: isTerminatedOrRetired
        ? currentStatus === 'retired'
          ? 'Đã nghỉ hưu'
          : 'Đã chấm dứt hợp đồng'
        : 'Chấm dứt / Nghỉ hưu',
      status: isTerminatedOrRetired ? 'current' : 'upcoming',
    },
  ];
}

interface ActionGuidance {
  responsibleActor: string;
  guidanceText: string;
  primaryActionLabel?: string;
  primaryActionType?: 'activate' | 'resume' | 'rehire';
  hasChangeStatusAction?: boolean;
  canTransfer?: boolean;
  canTerminate?: boolean;
}

function getActionGuidance(status: string): ActionGuidance {
  switch (status) {
    case 'probation':
      return {
        responsibleActor: 'Trưởng bộ phận & Phòng Hành chính Nhân sự',
        guidanceText:
          'Nhân viên đang trong thời gian thử việc. Quản lý trực tiếp và HR cần theo dõi hiệu suất công việc để ban hành quyết định Chuyển nhân viên chính thức (ký HĐLĐ chính thức) hoặc Chấm dứt hợp đồng thử việc.',
        primaryActionLabel: 'Chuyển chính thức (Activate)',
        primaryActionType: 'activate',
        canTransfer: true,
        canTerminate: true,
      };
    case 'working':
      return {
        responsibleActor: 'Phòng Nhân sự & Ban Giám đốc',
        guidanceText:
          'Nhân viên đang trong biên chế chính thức. Khi có quyết định điều chuyển công tác, tạm hoãn hợp đồng, đình chỉ hoặc chấm dứt quan hệ lao động, hãy sử dụng các hành động điều chuyển tương ứng.',
        hasChangeStatusAction: true,
        canTransfer: true,
        canTerminate: true,
      };
    case 'leave':
      return {
        responsibleActor: 'Phòng Hành chính Nhân sự',
        guidanceText:
          'Nhân viên đang trong thời gian tạm hoãn hợp đồng / nghỉ dài hạn không hưởng lương. Khi hết thời hạn tạm nghỉ, thực hiện tiếp nhận nhân viên đi làm lại để kích hoạt lại trạng thái làm việc chính thức.',
        primaryActionLabel: 'Tiếp nhận đi làm lại',
        primaryActionType: 'resume',
        canTransfer: true,
        canTerminate: true,
      };
    case 'suspended':
      return {
        responsibleActor: 'Hội đồng kỷ luật & Phòng Nhân sự',
        guidanceText:
          'Nhân viên đang bị tạm đình chỉ công tác để phục vụ xác minh hoặc xử lý kỷ luật. Sau khi có kết luận chính thức, bấm Tiếp nhận đi làm lại hoặc Chấm dứt hợp đồng lao động.',
        primaryActionLabel: 'Tiếp nhận đi làm lại',
        primaryActionType: 'resume',
        canTerminate: true,
      };
    case 'terminated':
      return {
        responsibleActor: 'Bộ phận Tuyển dụng & Phòng Nhân sự',
        guidanceText:
          'Hợp đồng lao động của nhân viên đã được thanh lý và chấm dứt. Nếu công ty có nhu cầu tiếp nhận lại nhân sự này trong tương lai, bấm Tái tuyển dụng để bắt đầu chu kỳ làm việc mới.',
        primaryActionLabel: 'Tái tuyển dụng (Rehire)',
        primaryActionType: 'rehire',
      };
    case 'retired':
      return {
        responsibleActor: 'Phòng Nhân sự & Chế độ chính sách',
        guidanceText:
          'Nhân viên đã hoàn thành thời gian công tác và chuyển sang chế độ hưu trí theo quy định của pháp luật.',
      };
    default:
      return {
        responsibleActor: 'Phòng Nhân sự',
        guidanceText: 'Theo dõi và quản lý vòng đời nhân viên theo quy định của tổ chức.',
        hasChangeStatusAction: true,
        canTransfer: true,
        canTerminate: true,
      };
  }
}

const TRANSFER_STAGE_LABELS: Record<string, string> = {
  manager_approval: 'Chờ Quản lý phê duyệt (Cấp 1/2)',
  hr_approval: 'Chờ Nhân sự phê duyệt (Cấp 2/2)',
  approved: 'Đã duyệt — Chờ ngày hiệu lực để áp dụng',
};

const BOARDING_STATUS_LABELS: Record<string, string> = {
  draft: 'Bản nháp',
  in_progress: 'Đang thực hiện',
  completed: 'Đã hoàn tất',
  cancelled: 'Đã huỷ',
};

export function EmployeeLifecycleWorkflowHero({
  employee,
  onEditClick,
  isEditing,
}: EmployeeLifecycleWorkflowHeroProps) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  const userPermissions = currentUser?.permissions ?? [];

  const isSuperAdmin = Boolean(
    currentUser?.isSuperAdmin ||
      userPermissions.includes('ALL') ||
      userPermissions.includes('sys:all'),
  );

  const canEdit =
    isSuperAdmin ||
    hasAnyPermission(userPermissions, [
      permissions.employees.edit,
      permissions.employees.updateAll,
      permissions.employees.manage,
    ]);

  const canManage =
    isSuperAdmin ||
    hasAnyPermission(userPermissions, [permissions.employees.manage]);

  const canScheduleTerminate =
    canManage ||
    hasAnyPermission(userPermissions, [permissions.employees.manageSensitive]);

  const canView =
    canEdit ||
    hasAnyPermission(userPermissions, [
      permissions.employees.view,
      permissions.employees.viewAll,
      permissions.employees.viewDepartment,
    ]);

  const isSelfEmployee = Boolean(
    currentUser?.employeeId && String(currentUser.employeeId) === String(employee.id),
  );
  const canApproveManagerTransfer =
    canManage ||
    ((canEdit || hasAnyPermission(userPermissions, [approval.requestsDecide])) &&
      !isSelfEmployee);

  const canViewWorkflowInstances =
    canApproveManagerTransfer ||
    canScheduleTerminate ||
    hasAnyPermission(userPermissions, ['workflow-instances:view']);

  const status = employee.status ?? 'working';
  const steps = getWorkflowSteps(status);
  const guidance = getActionGuidance(status);

  const { data: departments = [] } = useDepartmentsQuery();
  const { data: workflowInstances = [] } = useEmployeeWorkflowInstancesQuery(
    employee.id,
    canViewWorkflowInstances,
  );
  const { data: boardingStatus } = useEmployeeBoardingStatusQuery(employee.id, canView);

  // Active workflow instances for this employee
  const activeScheduledTermination = React.useMemo(
    () =>
      workflowInstances.find(
        (inst) =>
          inst.status === 'active' &&
          inst.subjectType === 'employee' &&
          inst.currentState === 'scheduled',
      ),
    [workflowInstances],
  );

  const activeTransferInstance = React.useMemo(
    () =>
      workflowInstances.find(
        (inst) =>
          inst.status === 'active' &&
          inst.subjectType === 'employee_transfer' &&
          ['manager_approval', 'hr_approval', 'approved'].includes(inst.currentState),
      ),
    [workflowInstances],
  );

  // Dialog states
  const [changeStatusOpen, setChangeStatusOpen] = React.useState(false);
  const [presetTargetStatus, setPresetTargetStatus] = React.useState<LifecycleStatus | undefined>(
    undefined,
  );
  const [terminateOpen, setTerminateOpen] = React.useState(false);
  const [rehireOpen, setRehireOpen] = React.useState(false);
  const [transferOpen, setTransferOpen] = React.useState(false);

  // Mutations for active workflows
  const cancelScheduledTerminationMut = useCancelScheduledTerminationMutation(queryClient, {
    onSuccess: () => {
      toast.success('Đã huỷ lịch hẹn chấm dứt hợp đồng lao động.');
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError
          ? getVietnameseApiErrorMessage(err, 'Không thể huỷ lịch chấm dứt hợp đồng')
          : 'Không thể huỷ lịch chấm dứt hợp đồng',
      );
    },
  });

  const approveTransferMut = useApproveTransferMutation(queryClient, {
    onSuccess: (res) => {
      if (res.newState === 'completed') {
        toast.success('Đã phê duyệt và áp dụng điều chuyển công tác thành công.');
      } else {
        toast.success('Đã phê duyệt yêu cầu điều chuyển công tác.');
      }
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError
          ? getVietnameseApiErrorMessage(err, 'Không thể phê duyệt điều chuyển')
          : 'Không thể phê duyệt điều chuyển',
      );
    },
  });

  const applyTransferMut = useApplyTransferMutation(queryClient, {
    onSuccess: () => {
      toast.success('Đã áp dụng quyết định điều chuyển công tác.');
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError
          ? getVietnameseApiErrorMessage(err, 'Không thể áp dụng điều chuyển')
          : 'Không thể áp dụng điều chuyển',
      );
    },
  });

  const rejectTransferMut = useRejectTransferMutation(queryClient, {
    onSuccess: () => {
      toast.success('Đã từ chối yêu cầu điều chuyển công tác.');
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError
          ? getVietnameseApiErrorMessage(err, 'Không thể từ chối điều chuyển')
          : 'Không thể từ chối điều chuyển',
      );
    },
  });

  const cancelTransferMut = useCancelTransferMutation(queryClient, {
    onSuccess: () => {
      toast.success('Đã huỷ yêu cầu điều chuyển công tác.');
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError
          ? getVietnameseApiErrorMessage(err, 'Không thể huỷ điều chuyển')
          : 'Không thể huỷ điều chuyển',
      );
    },
  });

  const handleOpenActivate = () => {
    setPresetTargetStatus('working');
    setChangeStatusOpen(true);
  };

  const handleOpenChangeStatus = () => {
    setPresetTargetStatus(undefined);
    setChangeStatusOpen(true);
  };

  const transferTargetDeptName = React.useMemo(() => {
    const toDeptId = activeTransferInstance?.metadata?.toDepartmentId;
    if (typeof toDeptId !== 'string') return null;
    return departments.find((d) => d.id === toDeptId)?.name ?? toDeptId;
  }, [activeTransferInstance, departments]);

  return (
    <>
      <div className='rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden'>
        {/* Top Header Strip */}
        <div className='flex flex-wrap items-center justify-between gap-4 border-b border-border/40 bg-muted/20 px-6 py-4'>
          <div className='flex items-center gap-3 min-w-0'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-base'>
              {employee.firstName ? employee.firstName[0] : 'E'}
            </div>
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-2.5'>
                <h1 className='text-base font-bold text-foreground truncate'>
                  {getEmployeeName(employee)}
                </h1>
                <span className='font-mono text-xs rounded bg-muted px-2 py-0.5 text-muted-foreground font-medium'>
                  {employee.employeeCode ?? 'NO-CODE'}
                </span>
                <EmployeeStatusBadge status={status} />
              </div>
              <p className='text-xs text-muted-foreground mt-0.5 truncate'>
                {employee.department?.name ?? 'Chưa phân phòng ban'}
                {employee.position?.name ? ` · ${employee.position.name}` : ''}
                {employee.startDate ? ` · Bắt đầu: ${formatDateVN(employee.startDate)}` : ''}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className='flex flex-wrap items-center gap-2 shrink-0'>
            {canEdit && !isEditing && (
              <>
                {guidance.primaryActionType === 'activate' && (
                  <Button
                    type='button'
                    size='sm'
                    className='bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm'
                    onClick={handleOpenActivate}
                  >
                    <Icons.check className='mr-1.5 size-4' />
                    {guidance.primaryActionLabel}
                  </Button>
                )}

                {guidance.primaryActionType === 'resume' && (
                  <Button
                    type='button'
                    size='sm'
                    className='bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm'
                    onClick={handleOpenActivate}
                  >
                    <Icons.check className='mr-1.5 size-4' />
                    {guidance.primaryActionLabel}
                  </Button>
                )}

                {guidance.primaryActionType === 'rehire' && canManage && (
                  <Button
                    type='button'
                    size='sm'
                    className='bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm'
                    onClick={() => setRehireOpen(true)}
                  >
                    <Icons.add className='mr-1.5 size-4' />
                    {guidance.primaryActionLabel}
                  </Button>
                )}

                {guidance.canTransfer && canManage && !activeTransferInstance && (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => setTransferOpen(true)}
                  >
                    <Icons.department className='mr-1.5 size-3.5' />
                    Điều chuyển công tác
                  </Button>
                )}

                {guidance.hasChangeStatusAction && (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleOpenChangeStatus}
                  >
                    <Icons.refresh className='mr-1.5 size-3.5' />
                    Chuyển trạng thái...
                  </Button>
                )}

                {guidance.canTerminate && !activeScheduledTermination && (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30'
                    onClick={() => setTerminateOpen(true)}
                  >
                    <Icons.userOff className='mr-1.5 size-3.5' />
                    Chấm dứt hợp đồng
                  </Button>
                )}

                {onEditClick && (
                  <Button type='button' variant='secondary' size='sm' onClick={onEditClick}>
                    <Icons.edit className='mr-1.5 size-3.5' />
                    Sửa hồ sơ
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Active Transfer Workflow Banner */}
        {activeTransferInstance && (
          <div className='flex flex-wrap items-center justify-between gap-3 border-b border-blue-500/30 bg-blue-500/10 px-6 py-3 text-xs'>
            <div className='flex items-start gap-2.5'>
              <Icons.department className='mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400' />
              <div>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='font-semibold text-foreground'>
                    Yêu cầu điều chuyển công tác đang xử lý
                  </span>
                  <Badge variant='outline' className='border-blue-500/40 text-blue-700 dark:text-blue-300 text-[11px]'>
                    {TRANSFER_STAGE_LABELS[activeTransferInstance.currentState] ??
                      activeTransferInstance.currentState}
                  </Badge>
                </div>
                <p className='mt-0.5 text-muted-foreground'>
                  Đơn vị mới:{' '}
                  <strong className='text-foreground'>
                    {transferTargetDeptName ?? 'Phòng ban mới'}
                  </strong>
                  {typeof activeTransferInstance.metadata?.toJobTitle === 'string' &&
                  activeTransferInstance.metadata.toJobTitle
                    ? ` · Chức danh: ${activeTransferInstance.metadata.toJobTitle}`
                    : ''}
                  {typeof activeTransferInstance.metadata?.effectiveDate === 'string'
                    ? ` · Ngày hiệu lực: ${formatDateVN(activeTransferInstance.metadata.effectiveDate)}`
                    : ''}
                </p>
              </div>
            </div>

            {(canApproveManagerTransfer || canManage) && (
              <div className='flex flex-wrap items-center gap-2'>
                {activeTransferInstance.currentState === 'manager_approval' &&
                  canApproveManagerTransfer && (
                  <Button
                    type='button'
                    size='sm'
                    className='h-7 text-xs'
                    disabled={approveTransferMut.isPending}
                    onClick={() =>
                      approveTransferMut.mutate({
                        id: employee.id,
                        instanceId: activeTransferInstance.id,
                        stage: 'manager',
                      })
                    }
                  >
                    <Icons.check className='mr-1 size-3.5' />
                    Quản lý duyệt
                  </Button>
                )}
                {activeTransferInstance.currentState === 'hr_approval' && canManage && (
                  <Button
                    type='button'
                    size='sm'
                    className='h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white'
                    disabled={approveTransferMut.isPending}
                    onClick={() =>
                      approveTransferMut.mutate({
                        id: employee.id,
                        instanceId: activeTransferInstance.id,
                        stage: 'hr',
                      })
                    }
                  >
                    <Icons.checks className='mr-1 size-3.5' />
                    HR duyệt & Áp dụng
                  </Button>
                )}
                {activeTransferInstance.currentState === 'approved' && canManage && (
                  <Button
                    type='button'
                    size='sm'
                    className='h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white'
                    disabled={applyTransferMut.isPending}
                    onClick={() =>
                      applyTransferMut.mutate({
                        id: employee.id,
                        instanceId: activeTransferInstance.id,
                      })
                    }
                  >
                    <Icons.check className='mr-1 size-3.5' />
                    Áp dụng ngay
                  </Button>
                )}
                {((activeTransferInstance.currentState === 'manager_approval' &&
                  canApproveManagerTransfer) ||
                  (activeTransferInstance.currentState === 'hr_approval' && canManage)) && (
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-7 text-xs text-destructive hover:text-destructive'
                    disabled={rejectTransferMut.isPending}
                    onClick={() =>
                      rejectTransferMut.mutate({
                        id: employee.id,
                        instanceId: activeTransferInstance.id,
                        note: 'Từ chối yêu cầu điều chuyển',
                      })
                    }
                  >
                    Từ chối
                  </Button>
                )}
                {canManage && (
                  <Button
                    type='button'
                    size='sm'
                    variant='ghost'
                    className='h-7 text-xs'
                    disabled={cancelTransferMut.isPending}
                    onClick={() =>
                      cancelTransferMut.mutate({
                        id: employee.id,
                        instanceId: activeTransferInstance.id,
                      })
                    }
                  >
                    Huỷ yêu cầu
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Active Scheduled Termination Banner */}
        {activeScheduledTermination && (
          <div className='flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-6 py-3 text-xs'>
            <div className='flex items-start gap-2.5'>
              <Icons.clock className='mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400' />
              <div>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='font-semibold text-foreground'>
                    Đã lên lịch chấm dứt hợp đồng lao động (Scheduled Termination)
                  </span>
                  <Badge variant='outline' className='border-amber-500/40 text-amber-700 dark:text-amber-300 text-[11px]'>
                    Hiệu lực:{' '}
                    {typeof activeScheduledTermination.metadata?.effectiveDate === 'string'
                      ? formatDateVN(activeScheduledTermination.metadata.effectiveDate)
                      : 'Đang chờ'}
                  </Badge>
                </div>
                {typeof activeScheduledTermination.metadata?.reason === 'string' &&
                  activeScheduledTermination.metadata.reason && (
                    <p className='mt-0.5 text-muted-foreground'>
                      Lý do: <span className='text-foreground'>{activeScheduledTermination.metadata.reason}</span>
                    </p>
                  )}
              </div>
            </div>

            {canScheduleTerminate && (
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='h-7 text-xs border-amber-500/40 hover:bg-amber-500/20'
                disabled={cancelScheduledTerminationMut.isPending}
                onClick={() => cancelScheduledTerminationMut.mutate(employee.id)}
              >
                <Icons.close className='mr-1 size-3.5' />
                Huỷ lịch chấm dứt
              </Button>
            )}
          </div>
        )}

        {/* Stepper Pipeline */}
        <div className='px-6 py-5 border-b border-border/40 bg-gradient-to-b from-muted/10 to-transparent'>
          <div className='mb-3 flex items-center justify-between'>
            <span className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              Tiến trình vòng đời nhân sự (Employee Lifecycle Pipeline)
            </span>
            <span className='text-xs text-muted-foreground'>
              Trạng thái hiện tại: <strong className='text-foreground'>{status.toUpperCase()}</strong>
            </span>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
            {steps.map((step, idx) => {
              const isCurrent = step.status === 'current';
              const isCompleted = step.status === 'completed';

              return (
                <div
                  key={step.id}
                  className={`relative flex items-center gap-3 rounded-xl border p-3 transition-all ${
                    isCurrent
                      ? 'border-primary/50 bg-primary/5 shadow-xs ring-1 ring-primary/30'
                      : isCompleted
                        ? 'border-border/60 bg-muted/20 text-foreground'
                        : 'border-border/30 bg-muted/5 opacity-60'
                  }`}
                >
                  {/* Step icon / number */}
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground animate-pulse'
                        : isCompleted
                          ? 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? <Icons.check className='size-4' /> : step.number}
                  </div>

                  <div className='min-w-0 flex-1'>
                    <p
                      className={`text-xs font-semibold truncate ${
                        isCurrent ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className='text-[11px] text-muted-foreground truncate'>{step.sublabel}</p>
                  </div>

                  {idx < steps.length - 1 && (
                    <div className='hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-muted-foreground/40'>
                      <Icons.arrowRight className='size-3.5' />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action & Responsible Actor Context Box + Boarding Quick Links */}
        <div className='flex flex-wrap items-center justify-between gap-4 bg-muted/30 p-4 text-xs'>
          <div className='flex items-start gap-3 flex-1 min-w-[280px]'>
            <div className='mt-0.5 rounded-md bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400 shrink-0'>
              <Icons.activity className='size-4' />
            </div>

            <div className='space-y-1 min-w-0'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='font-semibold text-foreground'>Người xử lý tiếp theo:</span>
                <span className='rounded bg-amber-500/15 px-2 py-0.5 font-medium text-amber-800 dark:text-amber-300'>
                  {guidance.responsibleActor}
                </span>
              </div>
              <p className='text-muted-foreground leading-relaxed'>{guidance.guidanceText}</p>
            </div>
          </div>

          {/* Onboarding / Offboarding Quick-Progress Card */}
          <div className='flex flex-wrap items-center gap-2 shrink-0'>
            {boardingStatus?.onboarding && (
              <span
                className='inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs font-medium'
              >
                <Icons.circleCheck className='size-3.5 text-emerald-600' />
                <span>
                  Onboarding:{' '}
                  <strong>
                    {BOARDING_STATUS_LABELS[boardingStatus.onboarding.status] ??
                      boardingStatus.onboarding.status}
                  </strong>
                </span>
              </span>
            )}

            {boardingStatus?.offboarding && (
              <span
                className='inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs font-medium'
              >
                <Icons.clock className='size-3.5 text-amber-600' />
                <span>
                  Offboarding:{' '}
                  <strong>
                    {BOARDING_STATUS_LABELS[boardingStatus.offboarding.status] ??
                      boardingStatus.offboarding.status}
                  </strong>
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Change Status Dialog */}
      <ChangeEmployeeStatusDialog
        employeeId={employee.id}
        employeeName={getEmployeeName(employee)}
        currentStatus={status}
        allowedTransitions={employee.allowedTransitions ?? []}
        presetTargetStatus={presetTargetStatus}
        open={changeStatusOpen}
        onOpenChange={setChangeStatusOpen}
      />

      {/* Request Transfer Dialog */}
      <RequestTransferDialog
        employeeId={employee.id}
        employeeName={getEmployeeName(employee)}
        currentDepartmentName={employee.department?.name}
        currentPositionName={employee.position?.name}
        open={transferOpen}
        onOpenChange={setTransferOpen}
      />

      {/* Terminate Dialog */}
      <TerminateEmployeeDialog
        employeeId={employee.id}
        employeeName={getEmployeeName(employee)}
        open={terminateOpen}
        onOpenChange={setTerminateOpen}
      />

      {/* Rehire Dialog */}
      <RehireEmployeeDialog
        employeeId={employee.id}
        employeeName={getEmployeeName(employee)}
        open={rehireOpen}
        onOpenChange={setRehireOpen}
      />
    </>
  );
}

