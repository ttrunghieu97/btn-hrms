import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import {
  createDepartment,
  createPosition,
  deleteDepartment,
  deletePosition,
  departmentInvalidations,
  updateDepartment,
  updatePosition,
  type DepartmentMutationPayload,
  type PositionMutationPayload
} from '../queries/department-queries';

export type { DepartmentMutationPayload, PositionMutationPayload };

export const createDepartmentMutation = mutationOptions({
  mutationFn: (payload: DepartmentMutationPayload) => createDepartment(payload),
  onSuccess: async () => {
    await departmentInvalidations.list(getQueryClient());
  }
});

export const updateDepartmentMutation = mutationOptions({
  mutationFn: ({ id, payload }: { id: string; payload: DepartmentMutationPayload }) =>
    updateDepartment(id, payload),
  onSuccess: async () => {
    await departmentInvalidations.list(getQueryClient());
  }
});

export const deleteDepartmentMutation = mutationOptions({
  mutationFn: (id: string) => deleteDepartment(id),
  onSuccess: async () => {
    await departmentInvalidations.list(getQueryClient());
  }
});

export const createPositionMutation = mutationOptions({
  mutationFn: (payload: PositionMutationPayload) => createPosition(payload),
  onSuccess: async () => {
    await departmentInvalidations.positions(getQueryClient());
  }
});

export const updatePositionMutation = mutationOptions({
  mutationFn: ({ id, payload }: { id: string; payload: PositionMutationPayload }) =>
    updatePosition(id, payload),
  onSuccess: async () => {
    await departmentInvalidations.positions(getQueryClient());
  }
});

export const deletePositionMutation = mutationOptions({
  mutationFn: (id: string) => deletePosition(id),
  onSuccess: async () => {
    await departmentInvalidations.positions(getQueryClient());
  }
});
