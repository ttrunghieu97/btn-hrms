import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import type {
  CancelEmployeeShiftAssignmentDto,
  PublishShiftRosterDto,
  UpdateEmployeeShiftAssignmentDto,
  UpdateWorkforceShiftTemplateDto
} from '@/api/generated/model';
import {
  approveShiftRoster,
  archiveShiftTemplate,
  cancelShiftAssignment,
  createShiftAssignment,
  createShiftTemplate,
  publishShiftRoster,
  rejectShiftRoster,
  shiftsInvalidations,
  submitShiftRoster,
  type RejectShiftRosterPayload,
  type ShiftAssignmentMutationPayload,
  type ShiftRosterWorkflowPayload,
  type ShiftTemplateMutationPayload,
  updateShiftAssignment,
  updateShiftTemplate
} from './queries';

export type { ShiftAssignmentMutationPayload, ShiftTemplateMutationPayload };

export const createShiftTemplateMutation = mutationOptions({
  mutationFn: (payload: ShiftTemplateMutationPayload) => createShiftTemplate(payload),
  onSuccess: async () => {
    await shiftsInvalidations.templates(getQueryClient());
  }
});

export const updateShiftTemplateMutation = mutationOptions({
  mutationFn: ({ id, payload }: { id: string; payload: UpdateWorkforceShiftTemplateDto }) =>
    updateShiftTemplate(id, payload),
  onSuccess: async () => {
    await shiftsInvalidations.templates(getQueryClient());
  }
});

export const archiveShiftTemplateMutation = mutationOptions({
  mutationFn: (id: string) => archiveShiftTemplate(id),
  onSuccess: async () => {
    await shiftsInvalidations.templates(getQueryClient());
  }
});

export const createShiftAssignmentMutation = mutationOptions({
  mutationFn: (payload: ShiftAssignmentMutationPayload) => createShiftAssignment(payload),
  onSuccess: async () => {
    await shiftsInvalidations.assignments(getQueryClient());
    await shiftsInvalidations.roster(getQueryClient());
  }
});

export const updateShiftAssignmentMutation = mutationOptions({
  mutationFn: ({ id, payload }: { id: string; payload: UpdateEmployeeShiftAssignmentDto }) =>
    updateShiftAssignment(id, payload),
  onSuccess: async () => {
    await shiftsInvalidations.assignments(getQueryClient());
    await shiftsInvalidations.roster(getQueryClient());
  }
});

export const cancelShiftAssignmentMutation = mutationOptions({
  mutationFn: ({ id, payload }: { id: string; payload: CancelEmployeeShiftAssignmentDto }) =>
    cancelShiftAssignment(id, payload),
  onSuccess: async () => {
    await shiftsInvalidations.assignments(getQueryClient());
    await shiftsInvalidations.roster(getQueryClient());
  }
});

export const submitShiftRosterMutation = mutationOptions({
  mutationFn: (payload: ShiftRosterWorkflowPayload) => submitShiftRoster(payload),
  onSuccess: async () => {
    await shiftsInvalidations.roster(getQueryClient());
  }
});

export const approveShiftRosterMutation = mutationOptions({
  mutationFn: (payload: ShiftRosterWorkflowPayload) => approveShiftRoster(payload),
  onSuccess: async () => {
    await shiftsInvalidations.roster(getQueryClient());
  }
});

export const rejectShiftRosterMutation = mutationOptions({
  mutationFn: (payload: RejectShiftRosterPayload) => rejectShiftRoster(payload),
  onSuccess: async () => {
    await shiftsInvalidations.roster(getQueryClient());
  }
});

export const publishShiftRosterMutation = mutationOptions({
  mutationFn: (payload: PublishShiftRosterDto) => publishShiftRoster(payload),
  onSuccess: async () => {
    await shiftsInvalidations.roster(getQueryClient());
  }
});
