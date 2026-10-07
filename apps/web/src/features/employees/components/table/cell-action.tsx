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
import { permissions } from '@/lib/permissions';
import { getQueryClient } from '@/lib/query-client';
import { toast } from 'sonner';
import { getVietnameseApiErrorMessage } from '@/lib/api-error-message';
import {
  useRemoveEmployeeMutation,
  useResetEmployeePasswordMutation,
} from '../../queries/employee-queries';
import { EmployeeDeleteDialog } from '../dialogs/employee-delete-dialog';
import { ResetPasswordDialog } from '../dialogs/reset-password-dialog';
import { TerminateEmployeeDialog } from '../dialogs/lifecycle/terminate-employee-dialog';
import { hasAnyPermission } from '@/lib/permissions';

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

  const canEdit =
    currentUser?.isSuperAdmin ||
    currentUser?.permissions?.includes('ALL') ||
    currentUser?.permissions?.includes(permissions.employees.edit);
  const canDelete =
    currentUser?.isSuperAdmin ||
    currentUser?.permissions?.includes('ALL') ||
    currentUser?.permissions?.includes(permissions.employees.edit);
  const canResetPassword =
    currentUser?.isSuperAdmin ||
    currentUser?.permissions?.includes('ALL') ||
    currentUser?.permissions?.includes(permissions.employees.resetPassword);

  const isDeleted = !!data.deletedAt;
  const canTerminate =
    hasAnyPermission(currentUser?.permissions ?? [], ['employees:edit', 'employees:manage']) &&
    data.allowedTransitions?.includes('terminated');

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

          {canEdit && !isDeleted && (
            <DropdownMenuItem onClick={() => router.push(`/employees/${data.id}`)}>
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
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
