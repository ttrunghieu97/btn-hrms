import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';
import { notifyMutationError, notifyMutationSuccess } from '@/lib/mutation-feedback';
import {
  fetchApprovalPolicies,
  fetchApprovalPolicy,
  createApprovalPolicy,
  updateApprovalPolicy,
  deactivateApprovalPolicy,
  fetchApprovalRequests,
  fetchApprovalRequest,
  decideApprovalStep,
  cancelApprovalRequest,
  fetchApprovalInbox,
  requestApproval,
} from './service';

const root = createKeyFactory('approval');

export const approvalKeys = {
  ...root,
  policies: () => [...root.all(), 'policies'] as const,
  policy: (id: string) => [...root.all(), 'policies', id] as const,
  requests: () => [...root.all(), 'requests'] as const,
  request: (id: string) => [...root.all(), 'requests', id] as const,
  inbox: () => [...root.all(), 'inbox'] as const,
};

// Policies
export function useApprovalPoliciesQuery(params?: { page?: number; limit?: number; key?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: [...approvalKeys.policies(), params],
    queryFn: () => fetchApprovalPolicies(params),
    ...queryPolicyPresets.static,
  });
}

export function useApprovalPolicyQuery(id: string) {
  return useQuery({
    queryKey: approvalKeys.policy(id),
    queryFn: () => fetchApprovalPolicy(id),
    enabled: !!id,
    ...queryPolicyPresets.static,
  });
}

export function useCreateApprovalPolicyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createApprovalPolicy,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: approvalKeys.policies() });
      notifyMutationSuccess('Tạo chính sách phê duyệt thành công');
    },
    onError: (error) => {
      notifyMutationError(error, 'Không thể tạo chính sách phê duyệt');
    },
  });
}

export function useUpdateApprovalPolicyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateApprovalPolicy>[1] }) => updateApprovalPolicy(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: approvalKeys.policies() });
      notifyMutationSuccess('Cập nhật chính sách phê duyệt thành công');
    },
    onError: (error) => {
      notifyMutationError(error, 'Không thể cập nhật chính sách phê duyệt');
    },
  });
}

export function useDeactivateApprovalPolicyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deactivateApprovalPolicy,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: approvalKeys.policies() });
      notifyMutationSuccess('Đã ngừng kích hoạt chính sách phê duyệt');
    },
    onError: (error) => {
      notifyMutationError(error, 'Không thể ngừng kích hoạt chính sách phê duyệt');
    },
  });
}

// Requests
export function useApprovalRequestsQuery(params?: { page?: number; limit?: number; status?: string; policyId?: string }) {
  return useQuery({
    queryKey: [...approvalKeys.requests(), params],
    queryFn: () => fetchApprovalRequests(params),
    ...queryPolicyPresets.static,
  });
}

export function useApprovalRequestQuery(id: string) {
  return useQuery({
    queryKey: approvalKeys.request(id),
    queryFn: () => fetchApprovalRequest(id),
    enabled: !!id,
    ...queryPolicyPresets.static,
  });
}

export function useRequestApprovalMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: requestApproval,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: approvalKeys.requests() });
      notifyMutationSuccess('Đã gửi yêu cầu phê duyệt');
    },
    onError: (error) => {
      notifyMutationError(error, 'Không thể gửi yêu cầu phê duyệt');
    },
  });
}

export function useDecideApprovalStepMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: string; data: Parameters<typeof decideApprovalStep>[1] }) =>
      decideApprovalStep(requestId, data),
    onSuccess: (_res, { data }) => {
      qc.invalidateQueries({ queryKey: approvalKeys.requests() });
      qc.invalidateQueries({ queryKey: approvalKeys.inbox() });
      notifyMutationSuccess(
        data.decision === 'approve' ? 'Đã phê duyệt yêu cầu' : 'Đã từ chối yêu cầu'
      );
    },
    onError: (error) => {
      notifyMutationError(error, 'Không thể xử lý bước phê duyệt');
    },
  });
}

export function useCancelApprovalRequestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelApprovalRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: approvalKeys.requests() });
      qc.invalidateQueries({ queryKey: approvalKeys.inbox() });
      notifyMutationSuccess('Đã hủy yêu cầu phê duyệt');
    },
    onError: (error) => {
      notifyMutationError(error, 'Không thể hủy yêu cầu phê duyệt');
    },
  });
}

// Inbox
export function useApprovalInboxQuery(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...approvalKeys.inbox(), params],
    queryFn: () => fetchApprovalInbox(params),
    ...queryPolicyPresets.static,
  });
}
