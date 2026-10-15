import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import {
  createDepartment,
  createLocation,
  createPosition,
  deleteDepartment,
  deleteLocation,
  deletePosition,
  departmentInvalidations,
  updateDepartment,
  updateLocation,
  updatePosition,
  type DepartmentMutationPayload,
  type LocationMutationPayload,
  type PositionMutationPayload
} from '../queries/department-queries';

export type { DepartmentMutationPayload, LocationMutationPayload, PositionMutationPayload };

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

export const createLocationMutation = mutationOptions({
  mutationFn: (payload: LocationMutationPayload) => createLocation(payload),
  onSuccess: async () => {
    await departmentInvalidations.locations(getQueryClient());
  }
});

export const updateLocationMutation = mutationOptions({
  mutationFn: ({ id, payload }: { id: string; payload: Partial<LocationMutationPayload> }) =>
    updateLocation(id, payload),
  onSuccess: async () => {
    await departmentInvalidations.locations(getQueryClient());
  }
});

export const deleteLocationMutation = mutationOptions({
  mutationFn: (id: string) => deleteLocation(id),
  onSuccess: async () => {
    await departmentInvalidations.locations(getQueryClient());
  }
});
