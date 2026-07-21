import { queryOptions, type QueryClient } from '@tanstack/react-query';
import {
  workforceShiftsControllerApproveRosterApi,
  workforceShiftsControllerArchiveTemplateApi,
  workforceShiftsControllerCancelAssignmentApi,
  workforceShiftsControllerCreateAssignmentApi,
  workforceShiftsControllerCreateTemplateApi,
  workforceShiftsControllerListAssignmentsApi,
  workforceShiftsControllerListTemplatesApi,
  workforceShiftsControllerPublishRosterApi,
  workforceShiftsControllerQueryRosterApi,
  workforceShiftsControllerRejectRosterApi,
  workforceShiftsControllerSubmitRosterApi,
  workforceShiftsControllerUpdateAssignmentApi,
  workforceShiftsControllerUpdateTemplateApi
} from '@/api/generated/endpoints';
import type {
  ApproveShiftRosterDto,
  CancelEmployeeShiftAssignmentDto,
  CreateEmployeeShiftAssignmentDto,
  CreateWorkforceShiftTemplateDto,
  PublishShiftRosterDto,
  RejectShiftRosterDto,
  SubmitShiftRosterDto,
  UpdateEmployeeShiftAssignmentDto,
  UpdateWorkforceShiftTemplateDto,
  WorkforceShiftsControllerListAssignmentsApiParams,
  WorkforceShiftsControllerListTemplatesApiParams,
  WorkforceShiftsControllerQueryRosterApiParams
} from '@/api/generated/model';
import { extractList, extractPagination, unwrapData, type PaginationMeta } from '@/lib/api-extract';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';

export type ShiftTemplateStatus = 'draft' | 'published' | 'archived';

export interface ShiftTemplateRow {
  id: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  overnight: boolean;
  activeWeekdays: string[];
  status: ShiftTemplateStatus;
  isActive: boolean;
  updatedAt?: string;
  raw: Record<string, unknown>;
}

export interface ShiftAssignmentRow {
  id: string;
  employeeId: string;
  employeeName: string;
  shiftTemplateId: string;
  shiftTemplateName: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: string;
  note?: string;
  raw: Record<string, unknown>;
}

export interface ShiftTemplateListResult {
  templates: ShiftTemplateRow[];
  pagination?: PaginationMeta;
  raw: unknown;
}

export interface ShiftAssignmentListResult {
  assignments: ShiftAssignmentRow[];
  pagination?: PaginationMeta;
  raw: unknown;
}

export interface ShiftRosterRow {
  assignmentId: string;
  assignmentStatus: string;
  employeeId: string;
  employeeName: string;
  departmentId?: string;
  shiftTemplateId: string;
  shiftTemplateCode: string;
  shiftTemplateName: string;
  positionId?: string;
  positionName?: string;
  locationId?: string;
  locationName?: string;
  workDate: string;
  startTime: string;
  endTime: string;
  overnight: boolean;
  breakMinutes: number;
  scheduledMinutes: number;
  raw: Record<string, unknown>;
}

export type ShiftRosterStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'published_locked';

export interface ShiftRosterPublication {
  isPublished: boolean;
  status: ShiftRosterStatus;
  submittedAt: string | null;
  submittedByUserId: string | null;
  approvedAt: string | null;
  approvedByUserId: string | null;
  rejectedAt: string | null;
  rejectedByUserId: string | null;
  rejectionReason: string | null;
  publishedAt: string | null;
  publishedByUserId: string | null;
  lockedAt: string | null;
  lockedByUserId: string | null;
  version: number;
}

export interface ShiftRosterResult {
  branchId?: string | null;
  departmentId?: string | null;
  from: string;
  to: string;
  publication: ShiftRosterPublication;
  rows: ShiftRosterRow[];
  raw: unknown;
}

export interface ShiftRosterWorkflowPayload {
  departmentId?: string;
  from: string;
  to: string;
}

export interface RejectShiftRosterPayload extends ShiftRosterWorkflowPayload {
  reason: string;
}

export type ShiftTemplateMutationPayload = CreateWorkforceShiftTemplateDto;
export type ShiftAssignmentMutationPayload = CreateEmployeeShiftAssignmentDto;

export const shiftsKeys = {
  templates: createKeyFactory<WorkforceShiftsControllerListTemplatesApiParams>('shift-templates').list,
  templatesAll: createKeyFactory<WorkforceShiftsControllerListTemplatesApiParams>('shift-templates').all,
  assignments: createKeyFactory<WorkforceShiftsControllerListAssignmentsApiParams>('shift-assignments').list,
  assignmentsAll: createKeyFactory<WorkforceShiftsControllerListAssignmentsApiParams>('shift-assignments').all,
  roster: createKeyFactory<WorkforceShiftsControllerQueryRosterApiParams>('shift-roster').list,
  rosterAll: createKeyFactory<WorkforceShiftsControllerQueryRosterApiParams>('shift-roster').all,
};

export const shiftsInvalidations = {
  templates: async (queryClient: QueryClient) => {
    await queryClient.invalidateQueries({ queryKey: createKeyFactory('shift-templates').all() });
  },
  assignments: async (queryClient: QueryClient) => {
    await queryClient.invalidateQueries({ queryKey: createKeyFactory('shift-assignments').all() });
  },
  roster: async (queryClient: QueryClient) => {
    await queryClient.invalidateQueries({ queryKey: createKeyFactory('shift-roster').all() });
  },
  all: async (queryClient: QueryClient) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: createKeyFactory('shift-templates').all() }),
      queryClient.invalidateQueries({ queryKey: createKeyFactory('shift-assignments').all() }),
      queryClient.invalidateQueries({ queryKey: createKeyFactory('shift-roster').all() }),
    ]);
  }
};

function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function getNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : fallback;
}

function getBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function mapTemplateRow(item: unknown): ShiftTemplateRow {
  const raw = (item ?? {}) as Record<string, unknown>;
  return {
    id: getString(raw.id),
    code: getString(raw.code),
    name: getString(raw.name),
    startTime: getString(raw.startTime),
    endTime: getString(raw.endTime),
    breakMinutes: getNumber(raw.breakMinutes),
    overnight: getBoolean(raw.overnight),
    activeWeekdays: getStringArray(raw.activeWeekdays),
    status: (getString(raw.status, 'draft') as ShiftTemplateStatus),
    isActive: getBoolean(raw.isActive, getString(raw.status) !== 'archived'),
    updatedAt: getString(raw.updatedAt) || undefined,
    raw
  };
}

function mapAssignmentRow(item: unknown): ShiftAssignmentRow {
  const raw = (item ?? {}) as Record<string, unknown>;
  const employee = (raw.employee ?? {}) as Record<string, unknown>;
  const template = (raw.shiftTemplate ?? {}) as Record<string, unknown>;
  const employeeName =
    getString(employee.fullName) ||
    `${getString(employee.firstName)} ${getString(employee.lastName)}`.trim() ||
    getString(employee.employeeCode) ||
    getString(raw.employeeId);

  return {
    id: getString(raw.id),
    employeeId: getString(raw.employeeId),
    employeeName,
    shiftTemplateId: getString(raw.shiftTemplateId),
    shiftTemplateName: getString(template.name) || getString(template.code),
    effectiveFrom: getString(raw.effectiveFrom),
    effectiveTo: getString(raw.effectiveTo) || undefined,
    status: getString(raw.status, 'planned'),
    note: getString(raw.note) || undefined,
    raw
  };
}

function mapRosterRow(item: unknown): ShiftRosterRow {
  const raw = (item ?? {}) as Record<string, unknown>;

  return {
    assignmentId: getString(raw.assignmentId),
    assignmentStatus: getString(raw.assignmentStatus, 'planned'),
    employeeId: getString(raw.employeeId),
    employeeName: getString(raw.employeeName) || getString(raw.employeeId),
    departmentId: getString(raw.departmentId) || undefined,
    shiftTemplateId: getString(raw.shiftTemplateId),
    shiftTemplateCode: getString(raw.shiftTemplateCode),
    shiftTemplateName: getString(raw.shiftTemplateName) || getString(raw.shiftTemplateCode),
    positionId: getString(raw.positionId) || undefined,
    positionName: getString(raw.positionName) || undefined,
    locationId: getString(raw.locationId) || undefined,
    locationName: getString(raw.locationName) || undefined,
    workDate: getString(raw.workDate),
    startTime: getString(raw.startTime),
    endTime: getString(raw.endTime),
    overnight: getBoolean(raw.overnight),
    breakMinutes: getNumber(raw.breakMinutes),
    scheduledMinutes: getNumber(raw.scheduledMinutes),
    raw
  };
}

export function shiftsTemplatesQueryOptions(
  params: WorkforceShiftsControllerListTemplatesApiParams = {},
  requestInit?: RequestInit
) {
  return queryOptions({
    queryKey: createKeyFactory<WorkforceShiftsControllerListTemplatesApiParams>('shift-templates').list(params),
    queryFn: async () => {
      const response = await workforceShiftsControllerListTemplatesApi(params, requestInit);
      return {
        templates: extractList<unknown>(response).map(mapTemplateRow),
        pagination: extractPagination(response),
        raw: response
      } satisfies ShiftTemplateListResult;
    },
    ...queryPolicyPresets['default']
  });
}

export function shiftsAssignmentsQueryOptions(
  params: WorkforceShiftsControllerListAssignmentsApiParams = {},
  requestInit?: RequestInit
) {
  return queryOptions({
    queryKey: createKeyFactory<WorkforceShiftsControllerListAssignmentsApiParams>('shift-assignments').list(params),
    queryFn: async () => {
      const response = await workforceShiftsControllerListAssignmentsApi(params, requestInit);
      return {
        assignments: extractList<unknown>(response).map(mapAssignmentRow),
        pagination: extractPagination(response),
        raw: response
      } satisfies ShiftAssignmentListResult;
    },
    ...queryPolicyPresets['default']
  });
}

export function shiftsRosterQueryOptions(
  params: WorkforceShiftsControllerQueryRosterApiParams,
  requestInit?: RequestInit
) {
  return queryOptions({
    queryKey: createKeyFactory<WorkforceShiftsControllerQueryRosterApiParams>('shift-roster').list(params),
    queryFn: async () => {
      const response = await workforceShiftsControllerQueryRosterApi(params, requestInit);
      const payload = unwrapData<Record<string, unknown>>(response) ?? {};
      const publication = (payload.publication ?? {}) as Record<string, unknown>;

      return {
        branchId: getString(payload.branchId) || null,
        departmentId: getString(payload.departmentId) || null,
        from: getString(payload.from, params.from),
        to: getString(payload.to, params.to),
        publication: {
          isPublished: getBoolean(publication.isPublished),
          status: (getString(publication.status, 'draft') as ShiftRosterStatus),
          submittedAt: getString(publication.submittedAt) || null,
          submittedByUserId: getString(publication.submittedByUserId) || null,
          approvedAt: getString(publication.approvedAt) || null,
          approvedByUserId: getString(publication.approvedByUserId) || null,
          rejectedAt: getString(publication.rejectedAt) || null,
          rejectedByUserId: getString(publication.rejectedByUserId) || null,
          rejectionReason: getString(publication.rejectionReason) || null,
          publishedAt: getString(publication.publishedAt) || null,
          publishedByUserId: getString(publication.publishedByUserId) || null,
          lockedAt: getString(publication.lockedAt) || null,
          lockedByUserId: getString(publication.lockedByUserId) || null,
          version: getNumber(publication.version, 1)
        },
        rows: Array.isArray(payload.rows) ? payload.rows.map(mapRosterRow) : [],
        raw: response
      } satisfies ShiftRosterResult;
    },
    ...queryPolicyPresets['default']
  });
}

export async function createShiftTemplate(payload: ShiftTemplateMutationPayload) {
  return unwrapData(await workforceShiftsControllerCreateTemplateApi(payload));
}

export async function updateShiftTemplate(id: string, payload: UpdateWorkforceShiftTemplateDto) {
  return unwrapData(await workforceShiftsControllerUpdateTemplateApi(id, payload));
}

export async function archiveShiftTemplate(id: string) {
  return unwrapData(await workforceShiftsControllerArchiveTemplateApi(id));
}

export async function createShiftAssignment(payload: ShiftAssignmentMutationPayload) {
  return unwrapData(await workforceShiftsControllerCreateAssignmentApi(payload));
}

export async function updateShiftAssignment(id: string, payload: UpdateEmployeeShiftAssignmentDto) {
  return unwrapData(await workforceShiftsControllerUpdateAssignmentApi(id, payload));
}

export async function cancelShiftAssignment(id: string, payload: CancelEmployeeShiftAssignmentDto) {
  return unwrapData(await workforceShiftsControllerCancelAssignmentApi(id, payload));
}

export async function publishShiftRoster(payload: PublishShiftRosterDto) {
  return unwrapData(await workforceShiftsControllerPublishRosterApi(payload));
}

export async function submitShiftRoster(payload: ShiftRosterWorkflowPayload) {
  return unwrapData(await workforceShiftsControllerSubmitRosterApi(payload as SubmitShiftRosterDto));
}

export async function approveShiftRoster(payload: ShiftRosterWorkflowPayload) {
  return unwrapData(await workforceShiftsControllerApproveRosterApi(payload as ApproveShiftRosterDto));
}

export async function rejectShiftRoster(payload: RejectShiftRosterPayload) {
  return unwrapData(await workforceShiftsControllerRejectRosterApi(payload as RejectShiftRosterDto));
}
