import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useLeaveManagementControllerCreate,
  useLeaveManagementControllerCancel,
} from '@/api/generated/endpoints';
import type { CreateLeaveRequestDto } from '@/api/generated/model';
import { leaveKeys } from '../queries/leave-queries';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';
import { leaveUiCopy } from '@/lib/app-copy';

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useLeaveManagementControllerCreate({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: leaveKeys.all() });
        notifyMutationSuccess('Tạo đơn nghỉ phép thành công');
      },
      onError: (e: unknown) => notifyMutationError(e, 'Tạo đơn nghỉ phép thất bại'),
    },
  });
}

export function useCancelLeaveRequest() {
  const qc = useQueryClient();
  return useLeaveManagementControllerCancel({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: leaveKeys.all() });
        notifyMutationSuccess(leaveUiCopy.actions.cancel ?? 'Đã hủy');
      },
      onError: (e: unknown) => notifyMutationError(e, 'Hủy đơn thất bại'),
    },
  });
}
