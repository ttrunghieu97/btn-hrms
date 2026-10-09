import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useLeaveManagementControllerCreate,
  useLeaveManagementControllerCancel,
} from '@/api/generated/leave-management/leave-management';
import {
  useApprovalInboxControllerApprove,
  useApprovalInboxControllerReject,
} from '@/api/generated/approval-inbox/approval-inbox';
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
        qc.invalidateQueries({ queryKey: ['/api/v1/approval/inbox'] });
        qc.invalidateQueries({ queryKey: ['/api/v1/leave'] });
        notifyMutationSuccess(leaveUiCopy.actions.cancel ?? 'Đã hủy');
      },
      onError: (e: unknown) => notifyMutationError(e, 'Hủy đơn thất bại'),
    },
  });
}

export function useApproveLeaveInboxRequest() {
  const qc = useQueryClient();
  return useApprovalInboxControllerApprove({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: leaveKeys.all() });
        qc.invalidateQueries({ queryKey: ['/api/v1/approval/inbox'] });
        qc.invalidateQueries({ queryKey: ['/api/v1/leave'] });
        notifyMutationSuccess('Phê duyệt đơn nghỉ phép thành công');
      },
      onError: (e: unknown) => notifyMutationError(e, 'Phê duyệt đơn thất bại'),
    },
  });
}

export function useRejectLeaveInboxRequest() {
  const qc = useQueryClient();
  return useApprovalInboxControllerReject({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: leaveKeys.all() });
        qc.invalidateQueries({ queryKey: ['/api/v1/approval/inbox'] });
        qc.invalidateQueries({ queryKey: ['/api/v1/leave'] });
        notifyMutationSuccess('Đã từ chối đơn nghỉ phép');
      },
      onError: (e: unknown) => notifyMutationError(e, 'Từ chối đơn thất bại'),
    },
  });
}
