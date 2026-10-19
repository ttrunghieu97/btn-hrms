'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icons } from '@/components/icons';
import { commonUiCopy } from '@/lib/app-copy';
import { feedbackCopy, feedbackEntity } from '@/lib/feedback-copy';
import type { EmployeeResponseDto } from '@/api/generated/model';
import { useAuthStore } from '@/stores/auth-store';
import { hasAnyPermission, permissions } from '@/lib/permissions';
import { getQueryClient } from '@/lib/query-client';
import { toast } from 'sonner';
import { getVietnameseApiErrorMessage } from '@/lib/api-error-message';
import {
  usePurgeEmployeeMutation,
  useRemoveEmployeeMutation,
  useResetEmployeePasswordMutation,
  useRestoreEmployeeMutation,
} from '../../queries/employee-queries';
import { EmployeeDeleteDialog } from '../dialogs/employee-delete-dialog';
import { ResetPasswordDialog } from '../dialogs/reset-password-dialog';
import { TerminateEmployeeDialog } from '../dialogs/lifecycle/terminate-employee-dialog';
import {
  ChangeEmployeeStatusDialog,
  type LifecycleStatus,
} from '../dialogs/lifecycle/change-employee-status-dialog';
import { RehireEmployeeDialog } from '../dialogs/lifecycle/rehire-employee-dialog';

interface CellActionProps {
  data: EmployeeResponseDto;
}


function getEmployeeName(employee: EmployeeResponseDto) {
  return [employee.firstName, employee.lastName].filter(Boolean).join(' ') || employee.username;
}

export function CellAction({ data }: CellActionProps) {
  const router = useRouter();
  const queryClient = getQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [resetPwOpen, setResetPwOpen] = React.useState(false);
  const [terminateOpen, setTerminateOpen] = React.useState(false);
  const [changeStatusOpen, setChangeStatusOpen] = React.useState(false);
  const [presetTargetStatus, setPresetTargetStatus] = React.useState<LifecycleStatus | undefined>(
    undefined,
  );
  const [rehireOpen, setRehireOpen] = React.useState(false);

  const isSuperAdmin = Boolean(
    currentUser?.isSuperAdmin ||
      currentUser?.permissions?.includes('ALL') ||
      currentUser?.permissions?.includes('sys:all'),
  );
  const canManage =
    isSuperAdmin ||
    hasAnyPermission(currentUser?.permissions ?? [], [
      permissions.employees.manage,
    ]);
  const canEdit =
    isSuperAdmin ||
    hasAnyPermission(currentUser?.permissions ?? [], [
      permissions.employees.edit,
      permissions.employees.manage,
    ]);
  const canDelete =
    isSuperAdmin ||
    hasAnyPermission(currentUser?.permissions ?? [], [
      permissions.employees.delete,
      permissions.employees.manage,
    ]);
  const canResetPassword =
    isSuperAdmin ||
    hasAnyPermission(currentUser?.permissions ?? [], [
      permissions.employees.resetPassword,
      permissions.employees.manage,
    ]);

  const isDeleted = !!data.deletedAt;
  const canTerminate =
    canEdit &&
    Boolean(data.allowedTransitions?.includes('terminated'));

  const removeMutation = useRemoveEmployeeMutation(queryClient, {
    onSuccess: () => {
      toast.success(feedbackCopy.success.deleted(feedbackEntity.employee));
      setDeleteOpen(false);
    },
    onError: (error) => {
      toast.error(
        getVietnameseApiErrorMessage(error, feedbackCopy.failure.delete(feedbackEntity.employee)),
      );
    },
  });

  const restoreMutation = useRestoreEmployeeMutation(queryClient, {
    onSuccess: () => {
      toast.success('Đã khôi phục hồ sơ nhân viên thành công.');
    },
    onError: (error) => {
      toast.error(
        getVietnameseApiErrorMessage(error, 'Khôi phục hồ sơ nhân viên thất bại'),
      );
    },
  });

  const purgeMutation = usePurgeEmployeeMutation(queryClient, {
    onSuccess: () => {
      toast.success('Đã xoá vĩnh viễn hồ sơ nhân viên.');
    },
    onError: (error) => {
      toast.error(
        getVietnameseApiErrorMessage(error, 'Xoá vĩnh viễn hồ sơ nhân viên thất bại'),
      );
    },
  });

  const resetPwMutation = useResetEmployeePasswordMutation({
    onSuccess: () => {
      toast.success('Mật khẩu đã được đặt lại thành công.');
      setResetPwOpen(false);
    },
    onError: (error) => {
      toast.error(
        getVietnameseApiErrorMessage(error, 'Đặt lại mật khẩu thất bại'),
      );
    },
  });

  return (
    <>
      <EmployeeDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        isPending={removeMutation.isPending}
        onConfirm={() => {
          if (!data.id) return;
          removeMutation.mutate(data.id);
        }}
      />
      <ResetPasswordDialog
        open={resetPwOpen}
        onOpenChange={setResetPwOpen}
        isPending={resetPwMutation.isPending}
        employeeName={getEmployeeName(data)}
        onConfirm={() => {
          if (!data.id) return;
          resetPwMutation.mutate(data.id);
        }}
      />
      <TerminateEmployeeDialog
        employeeId={data.id}
        employeeName={getEmployeeName(data)}
        open={terminateOpen}
        onOpenChange={setTerminateOpen}
      />
      <ChangeEmployeeStatusDialog
        employeeId={data.id}
        employeeName={getEmployeeName(data)}
        currentStatus={data.status ?? 'working'}
        allowedTransitions={data.allowedTransitions ?? []}
        presetTargetStatus={presetTargetStatus}
        open={changeStatusOpen}
        onOpenChange={setChangeStatusOpen}
      />
      <RehireEmployeeDialog
        employeeId={data.id}
        employeeName={getEmployeeName(data)}
        open={rehireOpen}
        onOpenChange={setRehireOpen}
      />

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='h-8 w-8 p-0'
            onClick={(e) => e.stopPropagation()}
          >
            <span className='sr-only'>{commonUiCopy.openMenu}</span>
            <Icons.ellipsis className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel>{commonUiCopy.actionsMenu}</DropdownMenuLabel>

          <DropdownMenuItem onClick={() => router.push(`/employees/${data.id}`)}>
            <Icons.eye className='mr-2 h-4 w-4' /> {commonUiCopy.viewDetails}
          </DropdownMenuItem>

          {canEdit && !isDeleted && data.status === 'probation' && (
            <DropdownMenuItem
              onClick={() => {
                setPresetTargetStatus('working');
                setChangeStatusOpen(true);
              }}
              className='text-emerald-600 focus:text-emerald-700 font-semibold'
            >
              <Icons.check className='mr-2 h-4 w-4' /> Chuyển chính thức (Activate)
            </DropdownMenuItem>
          )}

          {canEdit && !isDeleted && (data.status === 'leave' || data.status === 'suspended') && (
            <DropdownMenuItem
              onClick={() => {
                setPresetTargetStatus('working');
                setChangeStatusOpen(true);
              }}
              className='text-emerald-600 focus:text-emerald-700 font-semibold'
            >
              <Icons.check className='mr-2 h-4 w-4' /> Tiếp nhận đi làm lại
            </DropdownMenuItem>
          )}

          {canEdit && !isDeleted && data.status === 'working' && (
            <DropdownMenuItem
              onClick={() => {
                setPresetTargetStatus(undefined);
                setChangeStatusOpen(true);
              }}
            >
              <Icons.refresh className='mr-2 h-4 w-4' /> Chuyển trạng thái...
            </DropdownMenuItem>
          )}

          {canManage && data.status === 'terminated' && (
            <DropdownMenuItem
              onClick={() => setRehireOpen(true)}
              className='text-emerald-600 focus:text-emerald-700 font-semibold'
            >
              <Icons.add className='mr-2 h-4 w-4' /> Tái tuyển dụng (Rehire)

            </DropdownMenuItem>
          )}

          {canEdit && !isDeleted && (
            <DropdownMenuItem onClick={() => router.push(`/employees/${data.id}?mode=edit`)}>
              <Icons.edit className='mr-2 h-4 w-4' /> {commonUiCopy.edit}
            </DropdownMenuItem>
          )}

          {canResetPassword && !isDeleted && (
            <DropdownMenuItem onClick={() => setResetPwOpen(true)}>
              <Icons.lock className='mr-2 h-4 w-4' /> Đặt lại mật khẩu
            </DropdownMenuItem>
          )}

          {canTerminate && !isDeleted && (
            <DropdownMenuItem
              onClick={() => setTerminateOpen(true)}
              className='text-destructive focus:text-destructive'
            >
              <Icons.employee className='mr-2 h-4 w-4' /> Kết thúc hợp đồng
            </DropdownMenuItem>
          )}

          {canDelete && !isDeleted && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className='text-destructive focus:text-destructive'
              >
                <Icons.trash className='mr-2 h-4 w-4' /> {commonUiCopy.delete}
              </DropdownMenuItem>
            </>
          )}

          {canManage && isDeleted && data.status !== 'terminated' && (
            <DropdownMenuItem
              disabled={restoreMutation.isPending}
              onClick={() => {
                if (!data.id) return;
                restoreMutation.mutate(data.id);
              }}
              className='text-emerald-600 focus:text-emerald-700 font-semibold'
            >
              <Icons.refresh className='mr-2 h-4 w-4' /> Khôi phục hồ sơ
            </DropdownMenuItem>
          )}

          {isSuperAdmin && isDeleted && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={purgeMutation.isPending}
                onClick={() => {
                  if (!data.id) return;
                  purgeMutation.mutate(data.id);
                }}
                className='text-destructive focus:text-destructive'
              >
                <Icons.trash className='mr-2 h-4 w-4' /> Xoá vĩnh viễn
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

