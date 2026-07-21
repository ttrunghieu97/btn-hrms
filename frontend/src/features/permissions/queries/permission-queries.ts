import { useQuery } from '@tanstack/react-query';
import { permissionsControllerFindAll } from '@/api/generated/endpoints';
import { extractList } from '@/lib/api-extract';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';

interface PermissionDto {
  code: string;
  description?: string;
}

const root = createKeyFactory('permissions');

export const permissionKeys = {
  ...root
};

function enrichPermission(permission: PermissionDto) {
  const parts = permission.code.split(':');
  const modulePart = parts.length > 1 ? parts[0] : 'system';
  return {
    ...permission,
    id: permission.code,
    slug: permission.code,
    name: permission.description ?? permission.code,
    module: modulePart.charAt(0).toUpperCase() + modulePart.slice(1).toLowerCase()
  };
}

type EnrichedPermission = ReturnType<typeof enrichPermission>;

function groupByModule(permissions: EnrichedPermission[]): Record<string, EnrichedPermission[]> {
  return permissions.reduce<Record<string, EnrichedPermission[]>>((accumulator, permission) => {
    const module = permission.module ?? 'Other';
    if (!accumulator[module]) accumulator[module] = [];
    accumulator[module].push(permission);
    return accumulator;
  }, {});
}

export function usePermissionsQuery(enabled = true) {
  return useQuery({
    queryKey: permissionKeys.all(),
    queryFn: ({ signal }) => permissionsControllerFindAll({ signal }),
    select: (data) => {
      const list = extractList<PermissionDto>(data);
      const permissions = list.map(enrichPermission);
      return {
        permissions,
        groupedPermissions: groupByModule(permissions)
      };
    },
    enabled,
    ...queryPolicyPresets.static
  });
}
