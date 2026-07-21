import { queryOptions, useQuery } from '@tanstack/react-query';
import {
  departmentEmployeesControllerListByDepartment,
  departmentsControllerCreate,
  departmentsControllerFindAll,
  departmentsControllerFindOne,
  departmentsControllerRemove,
  departmentsControllerUpdate,
  positionsControllerCreate,
  positionsControllerFindAll,
  positionsControllerRemove,
  positionsControllerUpdate
} from '@/api/generated/endpoints';
import type {
  CreateDepartmentDto,
  CreatePositionDto,
  DepartmentEmployeesControllerListByDepartmentParams,
  DepartmentResponseDto,
  DepartmentsControllerFindAllParams,
  DepartmentsControllerFindOneParams,
  PositionListItemDto,
  UpdateDepartmentDto,
  UpdatePositionDto
} from '@/api/generated/model';
import { extractList, extractPagination, unwrapData } from '@/lib/api-extract';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';

export type DepartmentRow = DepartmentResponseDto;

export interface DepartmentListQueryParams {
  page: number;
  limit: number;
  name?: string;
  sort?: string;
}

export interface DepartmentMutationPayload {
  name: string;
  description?: string;
  parentId?: string | null;
}

export interface PositionMutationPayload {
  name: string;
  description?: string;
}

export const departmentKeys = createKeyFactory<DepartmentListQueryParams>('departments');
export const positionKeys = createKeyFactory('positions');

export const departmentInvalidations = {
  list: async (queryClient: import('@tanstack/react-query').QueryClient) => {
    await queryClient.invalidateQueries({ queryKey: departmentKeys.all() });
  },
  positions: async (queryClient: import('@tanstack/react-query').QueryClient) => {
    await queryClient.invalidateQueries({ queryKey: positionKeys.all() });
  },
  all: async (queryClient: import('@tanstack/react-query').QueryClient) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: departmentKeys.all() }),
      queryClient.invalidateQueries({ queryKey: positionKeys.all() })
    ]);
  }
};

function mapDepartmentListParams(params?: Partial<DepartmentListQueryParams>): DepartmentsControllerFindAllParams | undefined {
  if (!params) return undefined;

  return {
    page: params.page,
    limit: params.limit,
    name: params.name || undefined,
    sort: params.sort || undefined
  };
}

export function toDepartmentSort(sort: { id: string; desc: boolean }[] = []): string | undefined {
  const [first] = sort;
  if (!first) return undefined;
  return `${first.id}:${first.desc ? 'desc' : 'asc'}`;
}

export function departmentListQueryOptions(
  params?: Partial<DepartmentListQueryParams>,
  requestInit?: RequestInit
) {
  const normalizedParams: DepartmentListQueryParams = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    ...(params?.name ? { name: params.name } : {}),
    ...(params?.sort ? { sort: params.sort } : {})
  };

  return queryOptions({
    queryKey: departmentKeys.list(normalizedParams),
    queryFn: async () => {
      const response = await departmentsControllerFindAll(
        mapDepartmentListParams(normalizedParams),
        requestInit
      );

      return {
        rows: extractList<DepartmentRow>(response),
        pagination: extractPagination(response)
      };
    },
    ...queryPolicyPresets.static
  });
}

export function departmentDetailQueryOptions(
  id: string,
  params?: DepartmentsControllerFindOneParams,
  requestInit?: RequestInit
) {
  return queryOptions({
    queryKey: departmentKeys.detail(id),
    queryFn: async () =>
      unwrapData<DepartmentResponseDto>(
        await departmentsControllerFindOne(id, params, requestInit)
      ),
    ...queryPolicyPresets.static
  });
}

export function positionListQueryOptions(requestInit?: RequestInit) {
  return queryOptions({
    queryKey: positionKeys.list(),
    queryFn: async () => {
      const response = await positionsControllerFindAll(undefined, requestInit);
      return extractList<PositionListItemDto>(response).toSorted((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'vi')
      );
    },
    ...queryPolicyPresets.static
  });
}

export function useDepartmentsTableQuery(params: DepartmentListQueryParams) {
  return useQuery(departmentListQueryOptions(params));
}

export function useDepartmentDetailQuery(id?: string, enabled = true) {
  return useQuery({
    ...departmentDetailQueryOptions(id ?? ''),
    enabled: Boolean(id) && enabled
  });
}

export function usePositionsTableQuery() {
  return useQuery(positionListQueryOptions());
}

export async function createDepartment(payload: DepartmentMutationPayload) {
  return unwrapData<DepartmentResponseDto>(
    await departmentsControllerCreate(payload satisfies CreateDepartmentDto)
  );
}

export async function updateDepartment(id: string, payload: DepartmentMutationPayload) {
  return unwrapData<DepartmentResponseDto>(
    await departmentsControllerUpdate(id, payload satisfies UpdateDepartmentDto)
  );
}

export async function deleteDepartment(id: string) {
  await departmentsControllerRemove(id);
}

export async function createPosition(payload: PositionMutationPayload) {
  return unwrapData<PositionListItemDto>(
    await positionsControllerCreate(payload satisfies CreatePositionDto)
  );
}

export async function updatePosition(id: string, payload: PositionMutationPayload) {
  return unwrapData<PositionListItemDto>(
    await positionsControllerUpdate(id, payload satisfies UpdatePositionDto)
  );
}

export async function deletePosition(id: string) {
  await positionsControllerRemove(id);
}

export function useDepartmentEmployeesQuery(
  departmentId: string,
  params: DepartmentEmployeesControllerListByDepartmentParams = {}
) {
  return useQuery({
    queryKey: [...departmentKeys.detail(departmentId), 'employees', params],
    queryFn: ({ signal }) => departmentEmployeesControllerListByDepartment(departmentId, params, { signal }),
    enabled: Boolean(departmentId),
    select: (data) => ({
      employees: extractList(data),
      pagination: extractPagination(data),
      raw: data
    }),
    ...queryPolicyPresets.employees
  });
}
