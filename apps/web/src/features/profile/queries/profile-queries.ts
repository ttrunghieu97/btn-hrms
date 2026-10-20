/**
 * Profile queries delegate to the employees/users orval hooks.
 * No separate BE endpoint — profile = current user's employee record + user record.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeesControllerGetMyProfile } from '@/api/generated/employees-hr-management/employees-hr-management';
import { usersControllerGetMe } from '@/api/generated/users-management/users-management';
import type { EmployeeResponseDto, UserResponseDto } from '@/api/generated/model';
import { unwrapData } from '@/lib/api-extract';
import { isNotFoundError } from '@/lib/error-taxonomy';
import { customFetch } from '@/lib/fetcher';
import { queryPolicyPresets } from '@/lib/query-client';
import { createKeyFactory } from '@/lib/query-keys';

export const profileKeys = createKeyFactory('profile');

export function isEmployeeProfileMissingError(error: unknown) {
  return isNotFoundError(error);
}

export function useMyUserProfileQuery() {
  return useQuery({
    queryKey: profileKeys.detail('me'),
    queryFn: ({ signal }) => usersControllerGetMe({ signal }),
    select: (data) => unwrapData<UserResponseDto>(data),
    ...queryPolicyPresets['static']
  });
}

export function useMyEmployeeProfileQuery() {
  return useQuery({
    queryKey: profileKeys.detail('my-employee'),
    queryFn: ({ signal }) => employeesControllerGetMyProfile({ signal }),
    select: (data) => unwrapData<EmployeeResponseDto>(data),
    ...queryPolicyPresets['static']
  });
}

export interface UpdateMyProfilePayload {
  phoneNumber?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bankName?: string;
  bankAccountNumber?: string;
  taxCode?: string;
}

export function useUpdateMyEmployeeProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateMyProfilePayload) => {
      const response = await customFetch<EmployeeResponseDto>('/api/v1/employees/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return unwrapData<EmployeeResponseDto>(response);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.detail('my-employee') });
    },
  });
}

export interface SubmitMyResignationPayload {
  effectiveDate: string;
  lastWorkingDate?: string;
  reason: string;
}

export function useSubmitMyResignationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SubmitMyResignationPayload) => {
      const response = await customFetch<{
        success: boolean;
        workflowInstanceId: string;
        effectiveDate: string;
      }>('/api/v1/employees/me/resignation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedLastWorkingDate: payload.lastWorkingDate || payload.effectiveDate,
          reason: payload.reason,
        }),
      });
      return unwrapData(response);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.detail('my-employee') });
    },
  });
}

