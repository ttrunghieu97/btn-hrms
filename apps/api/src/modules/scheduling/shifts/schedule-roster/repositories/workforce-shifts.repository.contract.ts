import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { type EmployeeShiftAssignmentQueryDto } from '../../dto/employee-shift-assignment-query.dto';
import { type ShiftRosterQueryDto } from '../../dto/shift-roster-query.dto';
import { type WorkforceShiftTemplateQueryDto } from '../../dto/workforce-shift-template-query.dto';
import { type DataScope } from '../../../../../core/security/types/data-scope.interface';
import {
  type employeeShiftAssignments,
  type shiftRosterLifecycleHistory,
  type shiftRosterPublications,
  type shiftTemplates,
  type employees,
  type shiftRosterVersionSnapshots
} from '../../../../../infrastructure/database/schema';

type EmployeeRecord = Pick<
  InferSelectModel<typeof employees>,
  'id' | 'employeeCode' | 'firstName' | 'lastName' | 'departmentId'
>;

type ShiftTemplateBaseRecord = InferSelectModel<typeof shiftTemplates>;
type ShiftAssignmentBaseRecord = InferSelectModel<typeof employeeShiftAssignments>;
type ShiftRosterPublicationBaseRecord = InferSelectModel<typeof shiftRosterPublications>;
type ShiftRosterLifecycleHistoryBaseRecord = InferSelectModel<
  typeof shiftRosterLifecycleHistory
>;

export type ShiftTemplateRecord = ShiftTemplateBaseRecord;
export type ShiftRosterStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'published_locked';

export type ShiftAssignmentRecord = ShiftAssignmentBaseRecord & {
  employee?: EmployeeRecord;
  shiftTemplate?: Pick<
    ShiftTemplateBaseRecord,
    'id' | 'branchId' | 'code' | 'name' | 'startTime' | 'endTime' | 'breakMinutes' | 'isNightShift' | 'workDays'
  >;
};

export type ShiftAssignmentConflictRecord = Pick<
  ShiftAssignmentBaseRecord,
  'effectiveFrom' | 'effectiveTo'
>;

export type ShiftTemplateCreateValues = Omit<
  InferInsertModel<typeof shiftTemplates>,
  'id' | 'createdAt' | 'updatedAt'
>;
export type ShiftTemplateUpdateValues = Partial<ShiftTemplateCreateValues>;
export type ShiftAssignmentCreateValues = InferInsertModel<typeof employeeShiftAssignments>;
export type ShiftAssignmentUpdateValues = Partial<ShiftAssignmentCreateValues>;

export type RosterPublicationRecord = ShiftRosterPublicationBaseRecord;

export type RosterLifecycleHistoryRecord = ShiftRosterLifecycleHistoryBaseRecord;

export type RosterPublicationCreateValues = Omit<
  InferInsertModel<typeof shiftRosterPublications>,
  'id' | 'createdAt' | 'updatedAt'
>;

export type RosterPublicationUpdateValues = Partial<RosterPublicationCreateValues>;

export type RosterLifecycleHistoryCreateValues = Omit<
  InferInsertModel<typeof shiftRosterLifecycleHistory>,
  'id' | 'createdAt'
>;

type RosterVersionSnapshotBaseRecord = InferSelectModel<typeof shiftRosterVersionSnapshots>;
export type RosterVersionSnapshotRecord = RosterVersionSnapshotBaseRecord;
export type RosterVersionSnapshotCreateValues = Omit<
  InferInsertModel<typeof shiftRosterVersionSnapshots>,
  'id' | 'createdAt'
>;

export type RosterPeriodScope = {
  branchId?: string | null;
  departmentId?: string | null;
  from: string;
  to: string;
};

export interface IWorkforceShiftsRepository {
  findShiftTemplateById(id: string): Promise<ShiftTemplateRecord | null>;
  listShiftTemplates(
    query: WorkforceShiftTemplateQueryDto
  ): Promise<{ rows: ShiftTemplateRecord[]; total: number; page: number; limit: number }>;
  createShiftTemplate(values: ShiftTemplateCreateValues): Promise<ShiftTemplateRecord | null>;
  updateShiftTemplate(
    id: string,
    values: ShiftTemplateUpdateValues
  ): Promise<ShiftTemplateRecord | null>;

  findShiftAssignmentById(id: string, scope?: DataScope): Promise<ShiftAssignmentRecord | null>;
  findLocationById(id: string): Promise<{ id: string; name: string } | null>;
  listShiftAssignments(
    query: EmployeeShiftAssignmentQueryDto,
    scope?: DataScope
  ): Promise<{ rows: ShiftAssignmentRecord[]; total: number; page: number; limit: number }>;
  listEmployeeAssignmentsForConflict(
    employeeId: string,
    excludeId?: string,
    scope?: DataScope
  ): Promise<ShiftAssignmentConflictRecord[]>;
  createShiftAssignment(values: ShiftAssignmentCreateValues): Promise<ShiftAssignmentRecord | null>;
  updateShiftAssignment(
    id: string,
    values: ShiftAssignmentUpdateValues,
    expectedVersion?: number
  ): Promise<ShiftAssignmentRecord | null>;

  listRosterRows(query: ShiftRosterQueryDto, scope?: DataScope): Promise<ShiftAssignmentRecord[]>;
  upsertRosterPublication(
    values: RosterPublicationCreateValues | RosterPublicationUpdateValues
  ): Promise<RosterPublicationRecord | null>;
  findRosterPublication(query: ShiftRosterQueryDto): Promise<RosterPublicationRecord | null>;
  ensureRosterPublication(scope: RosterPeriodScope): Promise<RosterPublicationRecord>;
  getEmployeeAssignmentsForRange(
    employeeId: string,
    from: string,
    to: string
  ): Promise<ShiftAssignmentRecord[]>;
  getEmployeeActiveAssignmentsByDateRange(
    employeeId: string,
    from: string,
    to: string
  ): Promise<ShiftAssignmentRecord[]>;


  createRosterLifecycleHistory(
    values: RosterLifecycleHistoryCreateValues
  ): Promise<RosterLifecycleHistoryRecord | null>;
  findBlockingRosterPublication(
    scope: RosterPeriodScope
  ): Promise<RosterPublicationRecord | null>;

  createRosterVersionSnapshot(
    values: RosterVersionSnapshotCreateValues,
    tx?: any
  ): Promise<RosterVersionSnapshotRecord | null>;

  findRosterVersionSnapshots(
    rosterPublicationId: string
  ): Promise<RosterVersionSnapshotRecord[]>;
}

