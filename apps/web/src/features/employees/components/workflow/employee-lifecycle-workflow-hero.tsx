'use client';

import * as React from 'react';
import type { EmployeeResponseDto } from '@/api/generated/model';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { EmployeeStatusBadge } from '../display/employee-status-badge';
import { formatDateVN } from '@/lib/date';
import { getEmployeeName } from '../../utils/employee-display';
import { useAuthStore } from '@/stores/auth-store';
import { permissions } from '@/lib/permissions';
import { ChangeEmployeeStatusDialog, type LifecycleStatus } from '../dialogs/lifecycle/change-employee-status-dialog';
import { TerminateEmployeeDialog } from '../dialogs/lifecycle/terminate-employee-dialog';
import { RehireEmployeeDialog } from '../dialogs/lifecycle/rehire-employee-dialog';

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
        canTerminate: true,
      };
    case 'working':
      return {
        responsibleActor: 'Phòng Nhân sự & Ban Giám đốc',
        guidanceText:
          'Nhân viên đang trong biên chế chính thức. Khi có quyết định thay đổi công tác, tạm hoãn hợp đồng, đình chỉ hoặc chấm dứt quan hệ lao động, hãy sử dụng các hành động điều chuyển trạng thái tương ứng.',
        hasChangeStatusAction: true,
        canTerminate: true,
      };
    case 'leave':
      return {
        responsibleActor: 'Phòng Hành chính Nhân sự',
        guidanceText:
          'Nhân viên đang trong thời gian tạm hoãn hợp đồng / nghỉ dài hạn không hưởng lương. Khi hết thời hạn tạm nghỉ, thực hiện tiếp nhận nhân viên đi làm lại để kích hoạt lại trạng thái làm việc chính thức.',
        primaryActionLabel: 'Tiếp nhận đi làm lại',
        primaryActionType: 'resume',
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
        canTerminate: true,
      };
  }
}

export function EmployeeLifecycleWorkflowHero({
  employee,
  onEditClick,
  isEditing,
}: EmployeeLifecycleWorkflowHeroProps) {
  const currentUser = useAuthStore((state) => state.user);

  const canEdit =
    currentUser?.isSuperAdmin ||
    currentUser?.permissions?.includes('ALL') ||
    currentUser?.permissions?.includes(permissions.employees.edit) ||
    currentUser?.permissions?.includes(permissions.employees.create);

  const status = employee.status ?? 'working';
  const steps = getWorkflowSteps(status);
  const guidance = getActionGuidance(status);

  // Dialog states
  const [changeStatusOpen, setChangeStatusOpen] = React.useState(false);
  const [presetTargetStatus, setPresetTargetStatus] = React.useState<LifecycleStatus | undefined>(
    undefined,
  );
  const [terminateOpen, setTerminateOpen] = React.useState(false);
  const [rehireOpen, setRehireOpen] = React.useState(false);

  const handleOpenActivate = () => {
    setPresetTargetStatus('working');
    setChangeStatusOpen(true);
  };

  const handleOpenChangeStatus = () => {
    setPresetTargetStatus(undefined);
    setChangeStatusOpen(true);
  };

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

                {guidance.primaryActionType === 'rehire' && (
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

                {guidance.canTerminate && (
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

        {/* Action & Responsible Actor Context Box */}
        <div className='flex flex-wrap items-start justify-between gap-4 bg-muted/30 p-4 text-xs'>
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
