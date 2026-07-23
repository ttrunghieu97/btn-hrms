/**
 * Profile queries delegate to the employees/users orval hooks.
 * No separate BE endpoint — profile = current user's employee record + user record.
 */

import { useQuery } from '@tanstack/react-query';
import {
  employeesControllerGetMyProfile,
  usersControllerGetMe
} from '@/api/generated/endpoints';
import type { EmployeeResponseDto, UserResponseDto } from '@/api/generated/model';
import { unwrapData } from '@/lib/api-extract';
import { isNotFoundError } from '@/lib/error-taxonomy';
import { queryPolicyPresets } from '@/lib/query-client';
import { createKeyFactory } from '@/lib/query-keys';

const profileKeys = createKeyFactory('profile');

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
