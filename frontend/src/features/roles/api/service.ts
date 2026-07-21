import {
  accessControlControllerCreateGrant,
  rolesControllerCreate,
  rolesControllerFindAll,
  rolesControllerRemove,
  rolesControllerUpdate,
} from '@/api/generated/endpoints';
import type { CreateAccessGrantRequestDto, CreateRoleRequestDto, RoleResponseDto, UpdateRoleRequestDto } from '@/api/generated/model';
import { extractList, unwrapData } from '@/lib/api-extract';

export type Role = Omit<RoleResponseDto, 'description'> & {
  description?: string;
};

function normalizeRole(role: RoleResponseDto): Role {
  const description = typeof role.description === 'string'
    ? role.description
    : role.description == null
      ? undefined
      : String(role.description);

  return {
    ...role,
    description,
  };
}

export async function fetchRoles() {
  const res = await rolesControllerFindAll();
  return extractList<RoleResponseDto>(res).map(normalizeRole);
}

export async function createRole(data: CreateRoleRequestDto) {
  const res = await rolesControllerCreate(data);
  return normalizeRole(unwrapData<RoleResponseDto>(res));
}

export async function createAccessGrant(data: CreateAccessGrantRequestDto) {
  const res = await accessControlControllerCreateGrant(data);
  return unwrapData(res);
}

export async function updateRole(id: string, data: UpdateRoleRequestDto) {
  const res = await rolesControllerUpdate(id, data);
  return normalizeRole(unwrapData<RoleResponseDto>(res));
}

export async function deleteRole(id: string) {
  const res = await rolesControllerRemove(id);
  return normalizeRole(unwrapData<RoleResponseDto>(res));
}
