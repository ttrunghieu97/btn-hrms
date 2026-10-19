import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { createUser, deleteUser } from './service';
import { userInvalidations } from './queries';
import type { UserMutationPayload } from './types';
import { accessControlControllerUpdateAccessControl } from '@/api/generated/access-control/access-control';

export const createUserMutation = mutationOptions({
  mutationFn: (data: UserMutationPayload) => createUser(data),
  onSuccess: async () => {
    await userInvalidations.all(getQueryClient());
  }
});

export const deleteUserMutation = mutationOptions({
  mutationFn: (id: string) => deleteUser(id),
  onSuccess: async () => {
    await userInvalidations.all(getQueryClient());
  }
});

export const updateAccessControlMutation = mutationOptions({
  mutationFn: ({
    userId,
    roleIds,
    permissionCodes,
    isSuperAdmin,
  }: {
    userId: string;
    roleIds: string[];
    permissionCodes: string[];
    isSuperAdmin?: boolean;
  }) =>
    accessControlControllerUpdateAccessControl(userId, {
      roleIds,
      permissionCodes,
      isSuperAdmin,
    }),
  onSuccess: async () => {
    await userInvalidations.all(getQueryClient());
  },
});
