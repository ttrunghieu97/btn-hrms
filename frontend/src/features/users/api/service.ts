import {
  employeesControllerCreate,
  employeeAdminControllerRemove,
  employeesControllerUpdate,
  usersControllerFindAll
} from '@/api/generated/endpoints';
import type {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  UserListResponseDto,
  UsersControllerFindAllParams
} from '@/api/generated/model';

type EmployeesControllerCreateBody = CreateEmployeeDto;
type EmployeesControllerUpdateBody = UpdateEmployeeDto;
import { extractPagination, unwrapData } from '@/lib/api-extract';
import { userUiCopy } from '@/lib/app-copy';
import type { UserFilters, UsersResponse, UserMutationPayload } from './types';

function mapSort(sort?: string): string | undefined {
  if (!sort) return undefined;

  try {
    const sortItems = JSON.parse(sort) as { id: string; desc: boolean }[];
    const first = sortItems[0];
    if (!first) return undefined;

    const field = first.id === 'name' ? 'username' : first.id;
    return `${field}:${first.desc ? 'desc' : 'asc'}`;
  } catch {
    return undefined;
  }
}

function toCreatePayload(data: UserMutationPayload): EmployeesControllerCreateBody {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    ...(data.email ? { email: data.email } : {}),
    ...(data.phoneNumber ? { phoneNumber: data.phoneNumber } : {})
  };
}

function toUpdatePayload(data: UserMutationPayload): EmployeesControllerUpdateBody {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    ...(data.email ? { email: data.email } : {}),
    ...(data.phoneNumber ? { phoneNumber: data.phoneNumber } : {})
  };
}

export async function getUsers(filters: UserFilters): Promise<UsersResponse> {
  return getUsersWithRequest(filters);
}

export async function getUsersWithRequest(
  filters: UserFilters,
  requestInit?: RequestInit
): Promise<UsersResponse> {
  const params: UsersControllerFindAllParams = {
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    sort: mapSort(filters.sort)
  };

  const response = await usersControllerFindAll(params, requestInit);
  const payload = response.data;
  const pagination = extractPagination(response);

  return {
    success: true,
    time: new Date().toISOString(),
    message: userUiCopy.loadedFromBackend,
    total_users: pagination?.total ?? payload.data.length,
    offset: ((filters.page ?? 1) - 1) * (filters.limit ?? 10),
    limit: pagination?.limit ?? filters.limit ?? 10,
    users: payload.data
  };
}

export async function createUser(data: UserMutationPayload) {
  return unwrapData(await employeesControllerCreate(toCreatePayload(data)));
}

export async function updateUser(username: string, data: UserMutationPayload) {
  return unwrapData(
    await employeesControllerUpdate(username, toUpdatePayload(data))
  );
}

export async function deleteUser(username: string) {
  return unwrapData(await employeeAdminControllerRemove(username));
}
