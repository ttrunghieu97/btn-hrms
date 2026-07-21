import { queryOptions, useMutation, useQuery, type QueryClient } from '@tanstack/react-query';
import { createKeyFactory } from '@/lib/query-keys';
import { getQueryClient, queryPolicyPresets } from '@/lib/query-client';
import type { CreateAccessGrantRequestDto, RoleResponseDto, UpdateRoleRequestDto } from '@/api/generated/model';
import { createAccessGrant, createRole, deleteRole, fetchRoles, updateRole, type Role } from './service';
import { rolesControllerFindOne } from '@/api/generated/endpoints';
import { unwrapData } from '@/lib/api-extract';

const root = createKeyFactory('roles');

export const roleKeys = {
  ...root
};

export const roleInvalidations = {
  all: async (queryClient: QueryClient) => {
    await queryClient.invalidateQueries({ queryKey: roleKeys.all() });
  }
};

export const rolesQueryOptions = queryOptions({
  queryKey: roleKeys.all(),
  queryFn: () => fetchRoles(),
  ...queryPolicyPresets.static
});

export function useCreateRoleMutation() {
  return useMutation({
    mutationFn: createRole,
    onSuccess: async () => {
      await roleInvalidations.all(getQueryClient());
    }
  });
}

export function useUpdateRoleMutation() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleRequestDto }) => updateRole(id, data),
    onSuccess: async () => {
      await roleInvalidations.all(getQueryClient());
    }
  });
}

export function useCreateAccessGrantMutation() {
  return useMutation({
    mutationFn: (data: CreateAccessGrantRequestDto) => createAccessGrant(data),
  });
}

export function useDeleteRoleMutation() {
  return useMutation({
    mutationFn: deleteRole,
    onSuccess: async () => {
      await roleInvalidations.all(getQueryClient());
    }
  });
}

export function useRoleQuery(id: string) {
  return useQuery({
    queryKey: [...roleKeys.all(), id],
    queryFn: async () => {
      const res = await rolesControllerFindOne(id);
      const data = unwrapData<RoleResponseDto>(res);

      const description = typeof data.description === 'string'
        ? data.description
        : data.description == null
          ? undefined
          : String(data.description);

      return {
        ...data,
        description,
      } as Role;
    },
    enabled: !!id,
    ...queryPolicyPresets.static
  });
}
