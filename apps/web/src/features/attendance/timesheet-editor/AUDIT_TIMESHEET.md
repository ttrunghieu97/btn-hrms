# Timesheet Feature — Full Audit for AI Review

> 17 files across DB Schema → BE Service → FE Components.
> All content verbatim, no truncation.

---

## 1. DB Schema (Phase 1)

### `infrastructure/database/schema/attendance/enums.ts`

```ts
import { pgEnum } from "drizzle-orm/pg-core";

export const attendanceSessionEnum = pgEnum("attendance_session_enum", [
  "morning", "noon", "afternoon",
]);
export const attendanceSessionTypeEnum = pgEnum("attendance_session_type_enum", [
  "MORNING", "AFTERNOON", "LUNCH_DUTY", "NIGHT", "OT",
]);
export const attendanceSessionStatusEnum = pgEnum("attendance_session_status_enum", [
  "READY", "IN_PROGRESS", "COMPLETED", "MISSED", "CANCELLED",
]);
export const attendanceTypeEnum = pgEnum("attendance_type_enum", [
  "check_in", "check_out", "break_start", "break_end", "note",
]);
export const punchVerificationStatusEnum = pgEnum("punch_verification_status_enum", [
  "verified", "flagged", "rejected",
]);
export const leaveUnitEnum = pgEnum("leave_unit_enum", ["day", "hour"]);
export const leaveRequestStatusEnum = pgEnum("leave_request_status_enum", [
  "draft", "pending", "approved", "rejected", "cancelled",
]);
export const leaveSessionEnum = pgEnum("leave_session_enum", [
  "full_day", "morning", "afternoon",
]);
export const attendanceSummaryStatusEnum = pgEnum("attendance_summary_status_enum", [
  "present", "late", "early_leave", "absent", "leave", "holiday", "off",
]);
export const overtimeStatusEnum = pgEnum("overtime_status_enum", [
  "pending", "approved", "rejected", "cancelled",
]);
export const attendanceOverrideReasonEnum = pgEnum("attendance_override_reason_enum", [
  "manual_correction", "policy_exception", "data_fix", "reconciliation",
]);
export const attendanceEventTypeEnum = pgEnum("attendance_event_type_enum", [
  "CLOCK_IN", "CLOCK_OUT",
]);
export const attendanceEventSourceEnum = pgEnum("attendance_event_source_enum", [
  "DEVICE", "MANUAL",
]);
export const attendanceSourceEnum = pgEnum("attendance_source_enum", [
  "mobile", "web", "api", "manual",
  "manual_hr", "manual_employee", "import",
]);
export const attendancePeriodLockStatusEnum = pgEnum("attendance_period_lock_status_enum", [
  "open", "locked", "payroll_processing", "payroll_posted",
]);
export const lunchDutyTypeEnum = pgEnum("lunch_duty_type_enum", [
  "indoor", "outdoor",
]);
export const attendanceExceptionTypeEnum = pgEnum("attendance_exception_type_enum", [
  "missing_punch", "invalid_sequence", "off_shift",
]);
export const attendanceExceptionStatusEnum = pgEnum("attendance_exception_status_enum", [
  "pending", "resolved", "closed",
]);
```

### `infrastructure/database/schema/attendance/constants.ts`

```ts
export const AttendancePeriodStatus = {
  OPEN: "open",
  LOCKED: "locked",
  PAYROLL_PROCESSING: "payroll_processing",
  PAYROLL_POSTED: "payroll_posted",
} as const;

export type AttendancePeriodStatusType = (typeof AttendancePeriodStatus)[keyof typeof AttendancePeriodStatus];
export const PERIOD_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/;
```

### `infrastructure/database/schema/attendance/tables.ts` (attendancePeriodLocks)

```ts
export const attendancePeriodLocks = pgTable(
  "attendance_period_locks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    period: text("period").notNull().unique(),
    status: attendancePeriodLockStatusEnum("status")
      .default(AttendancePeriodStatus.OPEN)
      .notNull(),
    lockedByUserId: uuid("locked_by_user_id").references(() => users.id, { onDelete: "set null" }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    unlockedByUserId: uuid("unlocked_by_user_id").references(() => users.id, { onDelete: "set null" }),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
    remarks: text("remarks"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxPeriod: index("idx_attendance_period_locks_period").on(table.period),
    idxStatus: index("idx_attendance_period_locks_status").on(table.status),
    chkPeriodFormat: check(
      "chk_attendance_period_locks_period_format",
      sql`${table.period} ~ '^\\d{4}-(?:0[1-9]|1[0-2])$'`,
    ),
  }),
);
```

---

## 2. Domain Service + Repository (Phase 1)

### `modules/attendance/timekeeping/services/attendance-period-lock.service.ts`

```ts
import { Injectable } from "@nestjs/common";

export const ATTENDANCE_PERIOD_STATUS_OPEN = "open" as const;
export const ATTENDANCE_PERIOD_STATUS_LOCKED = "locked" as const;
export const ATTENDANCE_PERIOD_STATUS_PAYROLL_PROCESSING = "payroll_processing" as const;
export const ATTENDANCE_PERIOD_STATUS_PAYROLL_POSTED = "payroll_posted" as const;
export const ATTENDANCE_PERIOD_STATUSES = [
  ATTENDANCE_PERIOD_STATUS_OPEN, ATTENDANCE_PERIOD_STATUS_LOCKED,
  ATTENDANCE_PERIOD_STATUS_PAYROLL_PROCESSING, ATTENDANCE_PERIOD_STATUS_PAYROLL_POSTED,
] as const;
export type AttendancePeriodStatus = (typeof ATTENDANCE_PERIOD_STATUSES)[number];

export type AttendancePeriodLock = {
  id: string;
  period: string;
  status: AttendancePeriodStatus;
  lockedByUserId: string | null;
  lockedAt: Date | null;
  unlockedByUserId: string | null;
  unlockedAt: Date | null;
  remarks: string | null;
};

const STATUS_TRANSITIONS: Record<AttendancePeriodStatus, AttendancePeriodStatus[]> = {
  open: ["locked"],
  locked: ["open", "payroll_processing"],
  payroll_processing: ["payroll_posted", "open"],
  payroll_posted: ["open"],
};

@Injectable()
export class AttendancePeriodLockService {
  canEdit(status: AttendancePeriodStatus): boolean { return status === "open"; }
  canLock(status: AttendancePeriodStatus): boolean { return status === "open"; }
  canUnlock(status: AttendancePeriodStatus): boolean { return status === "locked"; }
  isPayrollLocked(status: AttendancePeriodStatus): boolean {
    return status === "payroll_processing" || status === "payroll_posted";
  }
  canTransition(from: AttendancePeriodStatus, to: AttendancePeriodStatus): boolean {
    return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
  }
  isValidStatus(value: string): value is AttendancePeriodStatus {
    return (ATTENDANCE_PERIOD_STATUSES as readonly string[]).includes(value);
  }
}
```

### `modules/attendance/timekeeping/repositories/attendance-period-lock.repository.ts`

```ts
import { Inject, Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import * as schema from "../../../../infrastructure/database/schema";
import { AttendancePeriodStatus, AttendancePeriodLock, ATTENDANCE_PERIOD_STATUS_OPEN } from "../services/attendance-period-lock.service";
import { attendancePeriodLocks } from "../../../../infrastructure/database/schema/attendance/tables";

type PeriodLockInsert = typeof schema.attendancePeriodLocks.$inferInsert;

@Injectable()
export class AttendancePeriodLockRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findByPeriod(period: string): Promise<AttendancePeriodLock | null> {
    const row = await this.db.select().from(attendancePeriodLocks)
      .where(eq(attendancePeriodLocks.period, period)).limit(1);
    if (!row.length) return null;
    return this.toDomain(row[0]!);
  }

  async upsert(params: { period: string; status: AttendancePeriodStatus; userId: string | null; remarks?: string }): Promise<AttendancePeriodLock> {
    const existing = await this.findByPeriod(params.period);
    if (existing) {
      const updateData: Partial<PeriodLockInsert> = { status: params.status, updatedAt: new Date() };
      if (params.status === "locked" && params.userId) { updateData.lockedByUserId = params.userId; updateData.lockedAt = new Date(); }
      if (params.status === "open" && params.userId) { updateData.unlockedByUserId = params.userId; updateData.unlockedAt = new Date(); }
      if (params.remarks !== undefined) updateData.remarks = params.remarks;
      const [row] = await this.db.update(attendancePeriodLocks).set(updateData).where(eq(attendancePeriodLocks.id, existing.id)).returning();
      return this.toDomain(row!);
    }
    const insertData: PeriodLockInsert = {
      period: params.period, status: params.status,
      lockedByUserId: params.status === "locked" ? params.userId : null,
      lockedAt: params.status === "locked" ? new Date() : null,
      remarks: params.remarks ?? null,
    };
    const [row] = await this.db.insert(attendancePeriodLocks).values(insertData).returning();
    return this.toDomain(row!);
  }

  async ensurePeriod(period: string): Promise<AttendancePeriodLock> {
    const existing = await this.findByPeriod(period);
    if (existing) return existing;
    const [row] = await this.db.insert(attendancePeriodLocks).values({ period, status: ATTENDANCE_PERIOD_STATUS_OPEN }).returning();
    return this.toDomain(row!);
  }

  private toDomain(row: Record<string, any>): AttendancePeriodLock {
    return {
      id: row.id, period: row.period, status: row.status as AttendancePeriodStatus,
      lockedByUserId: row.lockedByUserId ?? null, lockedAt: row.lockedAt ?? null,
      unlockedByUserId: row.unlockedByUserId ?? null, unlockedAt: row.unlockedAt ?? null,
      remarks: row.remarks ?? null,
    };
  }
}
```

### `modules/attendance/timekeeping/services/period-lock.service.ts`

```ts
import { Injectable } from "@nestjs/common";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { AttendancePeriodLockRepository } from "../repositories/attendance-period-lock.repository";
import { AttendancePeriodLockService, AttendancePeriodLock } from "../services/attendance-period-lock.service";

@Injectable()
export class PeriodLockService {
  constructor(
    private readonly periodLockRepo: AttendancePeriodLockRepository,
    private readonly periodLockService: AttendancePeriodLockService,
  ) {}

  async lock(actorUserId: string, period: string, remarks?: string): Promise<AttendancePeriodLock> {
    const lock = await this.periodLockRepo.ensurePeriod(period);
    if (!this.periodLockService.canLock(lock.status)) {
      throwBadRequest(`Period ${period} cannot be locked from status ${lock.status}`, ERROR_CODES.INVALID_REQUEST, { period, status: lock.status });
    }
    return this.periodLockRepo.upsert({ period, status: "locked", userId: actorUserId, remarks });
  }

  async unlock(actorUserId: string, period: string, remarks: string): Promise<AttendancePeriodLock> {
    const lock = await this.periodLockRepo.ensurePeriod(period);
    if (!this.periodLockService.canUnlock(lock.status)) {
      throwBadRequest(`Period ${period} cannot be unlocked from status ${lock.status}`, ERROR_CODES.INVALID_REQUEST, { period, status: lock.status });
    }
    return this.periodLockRepo.upsert({ period, status: "open", userId: actorUserId, remarks });
  }

  async getPeriodLock(period: string): Promise<AttendancePeriodLock | null> {
    return this.periodLockRepo.findByPeriod(period);
  }
}
```

---

## 3. Permission Codes (Phase 2)

### `packages/permissions/src/permissions/attendance.ts`

```ts
export const attendance = {
  check: 'attendance:check',
  viewSelf: 'attendance:view:self',
  viewDepartment: 'attendance:view:department',
  viewAll: 'attendance:view:all',
  report: 'attendance:report',
  overtimeSubmit: 'attendance:overtime:submit',
  overtimeApprove: 'attendance:overtime:approve',
  timesheetView: 'attendance:timesheet:view',
  timesheetManage: 'attendance:timesheet:manage',
  periodLockManage: 'attendance:period-lock:manage',
  periodUnlockManage: 'attendance:period-unlock:manage',
} as const;

export const attendanceHierarchy: readonly string[] = [
  'attendance:view:self', 'attendance:view:department', 'attendance:view:all',
] as const;
```

### `core/security/permissions/permissions.registry.ts` (attendance section)

```ts
const Permissions = {
  // ...
  ATTENDANCE_CHECK: PermissionRegistry.attendance.check,
  ATTENDANCE_VIEW_SELF: PermissionRegistry.attendance.viewSelf,
  ATTENDANCE_VIEW_DEPARTMENT: PermissionRegistry.attendance.viewDepartment,
  ATTENDANCE_VIEW_ALL: PermissionRegistry.attendance.viewAll,
  ATTENDANCE_REPORT: PermissionRegistry.attendance.report,
  ATTENDANCE_OVERTIME_SUBMIT: PermissionRegistry.attendance.overtimeSubmit,
  ATTENDANCE_OVERTIME_APPROVE: PermissionRegistry.attendance.overtimeApprove,
  ATTENDANCE_TIMESHEET_VIEW: PermissionRegistry.attendance.timesheetView,
  ATTENDANCE_TIMESHEET_MANAGE: PermissionRegistry.attendance.timesheetManage,
  ATTENDANCE_PERIOD_LOCK_MANAGE: PermissionRegistry.attendance.periodLockManage,
  ATTENDANCE_PERIOD_UNLOCK_MANAGE: PermissionRegistry.attendance.periodUnlockManage,
  // ...
} as const;
```

### `core/security/policies/attendance.policy.ts`

```ts
import { type AuthUser } from "../types/auth-user.interface";
import { type PolicyHandler } from "./policy-handler.interface";
import { Permissions } from "../permissions/permissions.registry";

class CheckAttendancePolicyHandler implements PolicyHandler {
  readonly policyName = "CheckAttendance";
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    if (user.permissions?.includes(Permissions.ATTENDANCE_CHECK)) return true;
    return Boolean(user.employeeId);
  }
}

class ViewAttendancePolicyHandler implements PolicyHandler {
  readonly policyName = "ViewAttendance";
  handle(user: AuthUser, resource?: any): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    const perms = user.permissions ?? [];
    if (perms.includes(Permissions.ATTENDANCE_VIEW_ALL)) return true;
    if (!resource) return perms.includes(Permissions.ATTENDANCE_VIEW_ALL) || perms.includes(Permissions.ATTENDANCE_VIEW_DEPARTMENT);
    if (perms.includes(Permissions.ATTENDANCE_VIEW_DEPARTMENT) && resource.departmentId && user.departmentId && String(resource.departmentId) === String(user.departmentId)) return true;
    if (perms.includes(Permissions.ATTENDANCE_VIEW_SELF) && resource.employeeId && user.employeeId && String(resource.employeeId) === String(user.employeeId)) return true;
    return false;
  }
}

class AttendanceReportPolicyHandler implements PolicyHandler {
  readonly policyName = "AttendanceReport";
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return user.permissions?.includes(Permissions.ATTENDANCE_REPORT) ?? false;
  }
}

class AttendanceTimesheetPolicyHandler implements PolicyHandler {
  readonly policyName = "AttendanceTimesheet";
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return (user.permissions ?? []).some((p) => p === Permissions.ATTENDANCE_TIMESHEET_VIEW || p === Permissions.ATTENDANCE_TIMESHEET_MANAGE);
  }
}

class AttendanceTimesheetManagePolicyHandler implements PolicyHandler {
  readonly policyName = "AttendanceTimesheetManage";
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return user.permissions?.includes(Permissions.ATTENDANCE_TIMESHEET_MANAGE) ?? false;
  }
}

class AttendancePeriodLockPolicyHandler implements PolicyHandler {
  readonly policyName = "AttendancePeriodLock";
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return user.permissions?.includes(Permissions.ATTENDANCE_PERIOD_LOCK_MANAGE) ?? false;
  }
}

class AttendancePeriodUnlockPolicyHandler implements PolicyHandler {
  readonly policyName = "AttendancePeriodUnlock";
  handle(user: AuthUser): boolean {
    if (user.isSuperAdmin || user.permissions?.includes("sys:all")) return true;
    return user.permissions?.includes(Permissions.ATTENDANCE_PERIOD_UNLOCK_MANAGE) ?? false;
  }
}

export const AttendancePolicies = {
  check: new CheckAttendancePolicyHandler(),
  view: new ViewAttendancePolicyHandler(),
  report: new AttendanceReportPolicyHandler(),
  timesheetView: new AttendanceTimesheetPolicyHandler(),
  timesheetManage: new AttendanceTimesheetManagePolicyHandler(),
  periodLock: new AttendancePeriodLockPolicyHandler(),
  periodUnlock: new AttendancePeriodUnlockPolicyHandler(),
};
```

---

## 4. DTOs (Phase 2)

### `modules/attendance/timekeeping/dto/timesheet.dto.ts`

```ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type, Transform } from "class-transformer";
import { IsArray, IsOptional, IsString, IsUUID, Matches, ValidateNested, ArrayMinSize } from "class-validator";

export class BatchTimesheetRecordDto {
  @ApiProperty() @IsUUID() employeeId!: string;
  @ApiProperty({ description: "YYYY-MM-DD" }) @Matches(/^\d{4}-\d{2}-\d{2}$/) workDate!: string;
  @ApiProperty({ description: "HH:mm" }) @Matches(/^\d{2}:\d{2}$/) checkIn!: string;
  @ApiProperty({ description: "HH:mm" }) @Matches(/^\d{2}:\d{2}$/) checkOut!: string;
}

export class BatchTimesheetDto {
  @ApiProperty({ description: "Period in YYYY-MM format" }) @Matches(/^\d{4}-(?:0[1-9]|1[0-2])$/) period!: string;
  @ApiProperty({ type: [BatchTimesheetRecordDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => BatchTimesheetRecordDto) records!: BatchTimesheetRecordDto[];
}

export class LockPeriodDto {
  @Matches(/^\d{4}-(?:0[1-9]|1[0-2])$/) period!: string;
  @IsOptional() @IsString() remarks?: string;
}

export class UnlockPeriodDto {
  @Matches(/^\d{4}-(?:0[1-9]|1[0-2])$/) period!: string;
  @IsString() remarks!: string;
}

export class BatchErrorDto {
  @ApiProperty() employeeId!: string;
  @ApiProperty({ description: "YYYY-MM-DD" }) workDate!: string;
  @ApiProperty() reason!: string;
}

export class BatchTimesheetResponseDto {
  @ApiProperty() success!: number;
  @ApiProperty() failed!: number;
  @ApiProperty({ type: [BatchErrorDto] }) errors!: BatchErrorDto[];
}

export class PeriodLockResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() period!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true }) lockedByUserId!: string | null;
  @ApiProperty({ nullable: true }) lockedAt!: Date | null;
  @ApiProperty({ nullable: true }) unlockedByUserId!: string | null;
  @ApiProperty({ nullable: true }) unlockedAt!: Date | null;
  @ApiProperty({ nullable: true }) remarks!: string | null;
}
```

### `modules/attendance/timekeeping/dto/timesheet-workspace.dto.ts`

```ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, Matches } from "class-validator";

export class TimesheetWorkspaceQueryDto {
  @Matches(/^\d{4}-(?:0[1-9]|1[0-2])$/) period!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() departmentId?: string;
}

export class TimesheetWorkspaceEmployeeDto {
  @ApiProperty() id!: string;
  @ApiProperty() employeeCode!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty({ nullable: true }) departmentName!: string | null;
}

export class TimesheetWorkspaceRecordDto {
  @ApiProperty() employeeId!: string;
  @ApiProperty() workDate!: string;
  @ApiProperty({ nullable: true }) status!: string | null;
  @ApiProperty({ nullable: true }) checkIn!: string | null;
  @ApiProperty({ nullable: true }) checkOut!: string | null;
  @ApiProperty({ nullable: true }) workedMinutes!: number | null;
  @ApiProperty({ nullable: true }) scheduledMinutes!: number | null;
  @ApiProperty({ nullable: true }) lateMinutes!: number | null;
  @ApiProperty({ nullable: true }) earlyLeaveMinutes!: number | null;
  @ApiProperty({ nullable: true }) overtimeMinutes!: number | null;
  @ApiProperty({ nullable: true }) isHoliday!: boolean | null;
}

export class TimesheetWorkspaceResponseDto {
  @ApiProperty() period!: string;
  @ApiProperty() periodStatus!: string;
  @ApiProperty({ type: [TimesheetWorkspaceEmployeeDto] }) employees!: TimesheetWorkspaceEmployeeDto[];
  @ApiProperty({ type: [TimesheetWorkspaceRecordDto] }) records!: TimesheetWorkspaceRecordDto[];
}
```

---

## 5. TimesheetService (Phase 2)

### `modules/attendance/timekeeping/services/timesheet.service.ts`

```ts
import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import * as schema from "../../../../infrastructure/database/schema";
import { CONTRACTS_TOKENS, WorkforceTimeManagementPort } from "../../../../contracts";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { AttendancePeriodLockService } from "../services/attendance-period-lock.service";
import { AttendancePeriodLockRepository } from "../repositories/attendance-period-lock.repository";
import { RecomputeAttendanceDayUseCase } from "../use-cases/recompute-attendance-day.usecase";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { AttendanceTimekeepingRepository } from "../repositories/attendance-timekeeping.repository";
import { BatchTimesheetDto, BatchTimesheetResponseDto, BatchErrorDto, BatchTimesheetRecordDto } from "../dto/timesheet.dto";

@Injectable()
export class TimesheetService {
  private readonly logger: ContextLogger;
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly periodLockRepo: AttendancePeriodLockRepository,
    private readonly periodLockService: AttendancePeriodLockService,
    private readonly recomputeAttendanceDay: RecomputeAttendanceDayUseCase,
    private readonly timekeepingRepo: AttendanceTimekeepingRepository,
    @Inject(CONTRACTS_TOKENS.WORKFORCE_TIME_MANAGEMENT_PORT) private readonly workforcePort: WorkforceTimeManagementPort,
    private readonly requestContext: RequestContextService,
  ) { this.logger = new ContextLogger(this.requestContext, TimesheetService.name); }

  async batchSave(actorUserId: string, dto: BatchTimesheetDto): Promise<BatchTimesheetResponseDto> {
    const periodLock = await this.periodLockRepo.ensurePeriod(dto.period);
    if (!this.periodLockService.canEdit(periodLock.status)) {
      throwBadRequest(`Period ${dto.period} is ${periodLock.status} — edits not allowed`, ERROR_CODES.INVALID_REQUEST, { period: dto.period, status: periodLock.status });
    }
    const errors: BatchErrorDto[] = [];
    let successCount = 0;
    for (const record of dto.records) {
      try { await this.processSingleRecord(actorUserId, dto.period, record); successCount++; }
      catch (err: any) { errors.push({ employeeId: record.employeeId, workDate: record.workDate, reason: err?.message ?? "Unknown error" }); }
    }
    return { success: successCount, failed: errors.length, errors };
  }

  private async processSingleRecord(actorUserId: string, period: string, record: BatchTimesheetRecordDto): Promise<void> {
    const recordPeriod = record.workDate.substring(0, 7);
    if (recordPeriod !== period) throw new Error(`Work date ${record.workDate} does not belong to period ${period}`);
    if (record.checkIn >= record.checkOut) throw new Error(`Check-in ${record.checkIn} must be before check-out ${record.checkOut}`);
    const employeeContext = await this.workforcePort.getEmployeeContext(record.employeeId);
    if (!employeeContext || employeeContext.employmentStatus !== "eligible") throw new Error(`Employee ${record.employeeId} is not eligible for attendance`);
    const checkInTime = new Date(`${record.workDate}T${record.checkIn}:00`);
    const checkOutTime = new Date(`${record.workDate}T${record.checkOut}:00`);
    await this.timekeepingRepo.transaction(async () => {
      const existing = await this.timekeepingRepo.findClockEventsByEmployeeDay(record.employeeId, record.workDate);
      for (const event of existing) { await this.db.delete(schema.attendances).where(eq(schema.attendances.id, event.id)); }
      await this.timekeepingRepo.createClockEvent({ employeeId: record.employeeId, type: "check_in", time: checkInTime, date: record.workDate, source: "manual_hr", session: this.determineSession(record.checkIn) });
      await this.timekeepingRepo.createClockEvent({ employeeId: record.employeeId, type: "check_out", time: checkOutTime, date: record.workDate, source: "manual_hr", session: this.determineSession(record.checkOut) });
      await this.recomputeAttendanceDay.execute(record.employeeId, record.workDate);
    });
  }

  private determineSession(time: string): "morning" | "noon" | "afternoon" {
    const hour = parseInt(time.split(":")[0]!, 10);
    if (hour < 12) return "morning";
    if (hour < 13) return "noon";
    return "afternoon";
  }
}
```

---

## 6. QueryTimesheetWorkspaceUseCase (Phase 3)

### `modules/attendance/timekeeping/use-cases/query-timesheet-workspace.usecase.ts`

```ts
import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import * as schema from "../../../../infrastructure/database/schema";
import { AttendancePeriodLockRepository } from "../repositories/attendance-period-lock.repository";
import { AttendancePeriodLockService } from "../services/attendance-period-lock.service";
import { TimesheetWorkspaceQueryDto, TimesheetWorkspaceResponseDto, TimesheetWorkspaceEmployeeDto, TimesheetWorkspaceRecordDto } from "../dto/timesheet-workspace.dto";

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
function daysInMonth(year: number, month: number): number {
  if (month === 2 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) return 29;
  return DAYS_IN_MONTH[month - 1]!;
}

@Injectable()
export class QueryTimesheetWorkspaceUseCase {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly periodLockRepo: AttendancePeriodLockRepository,
    private readonly periodLockService: AttendancePeriodLockService,
  ) {}

  async execute(query: TimesheetWorkspaceQueryDto): Promise<TimesheetWorkspaceResponseDto> {
    const period = query.period;
    const [year, month] = period.split("-").map(Number);
    const lastDay = daysInMonth(year!, month!);
    const from = `${period}-01`;
    const to = `${period}-${String(lastDay).padStart(2, "0")}`;

    const periodLock = await this.periodLockRepo.ensurePeriod(period);

    const conditions: any[] = [];
    if (query.departmentId) conditions.push(eq(schema.orgAssignments.departmentId, query.departmentId));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const employeeRows = await this.db
      .select({ id: schema.employees.id, employeeCode: schema.employees.employeeCode, firstName: schema.employees.firstName, lastName: schema.employees.lastName, departmentName: schema.departments.name })
      .from(schema.employees)
      .leftJoin(schema.orgAssignments, eq(schema.orgAssignments.employeeId, schema.employees.id))
      .leftJoin(schema.departments, eq(schema.departments.id, schema.orgAssignments.departmentId))
      .where(whereClause)
      .orderBy(schema.employees.firstName);

    const employees: TimesheetWorkspaceEmployeeDto[] = employeeRows.map((r) => ({
      id: r.id, employeeCode: r.employeeCode,
      fullName: r.lastName ? `${r.firstName} ${r.lastName}` : r.firstName,
      departmentName: r.departmentName ?? null,
    }));

    const employeeIds = employees.map((e) => e.id);
    if (employeeIds.length === 0) return { period, periodStatus: periodLock.status, employees, records: [] };

    const summaryRows = await this.db
      .select({ employeeId: schema.attendanceDailySummaries.employeeId, workDate: schema.attendanceDailySummaries.workDate, status: schema.attendanceDailySummaries.status, workedMinutes: schema.attendanceDailySummaries.workedMinutes, scheduledMinutes: schema.attendanceDailySummaries.scheduledMinutes, lateMinutes: schema.attendanceDailySummaries.lateMinutes, earlyLeaveMinutes: schema.attendanceDailySummaries.earlyLeaveMinutes, overtimeMinutes: schema.attendanceDailySummaries.overtimeMinutes, isHoliday: schema.attendanceDailySummaries.isHoliday })
      .from(schema.attendanceDailySummaries)
      .where(inArray(schema.attendanceDailySummaries.employeeId, employeeIds) as any);

    const eventRows = await this.db
      .select({ employeeId: schema.attendances.employeeId, date: schema.attendances.date, type: schema.attendances.type, time: schema.attendances.time })
      .from(schema.attendances)
      .where(inArray(schema.attendances.employeeId, employeeIds) as any);

    const eventMap = new Map<string, { checkIn: string | null; checkOut: string | null }>();
    for (const event of eventRows) {
      if (event.date < from || event.date > to) continue;
      const key = `${event.employeeId}_${event.date}`;
      const entry = eventMap.get(key) ?? { checkIn: null, checkOut: null };
      const timeStr = event.time ? event.time.toISOString() : null;
      if (event.type === "check_in" && timeStr) entry.checkIn = timeStr;
      else if (event.type === "check_out" && timeStr) entry.checkOut = timeStr;
      eventMap.set(key, entry);
    }

    const records: TimesheetWorkspaceRecordDto[] = [];
    for (const row of summaryRows) {
      if (row.workDate >= from && row.workDate <= to) {
        const key = `${row.employeeId}_${row.workDate}`;
        const times = eventMap.get(key);
        records.push({
          employeeId: row.employeeId, workDate: row.workDate, status: row.status,
          checkIn: times?.checkIn ?? null, checkOut: times?.checkOut ?? null,
          workedMinutes: row.workedMinutes ? Number(row.workedMinutes) : null,
          scheduledMinutes: row.scheduledMinutes ? Number(row.scheduledMinutes) : null,
          lateMinutes: row.lateMinutes ? Number(row.lateMinutes) : null,
          earlyLeaveMinutes: row.earlyLeaveMinutes ? Number(row.earlyLeaveMinutes) : null,
          overtimeMinutes: row.overtimeMinutes ? Number(row.overtimeMinutes) : null,
          isHoliday: row.isHoliday,
        });
      }
    }
    return { period, periodStatus: periodLock.status, employees, records };
  }
}
```

---

## 7. Controller + Module (Phase 2)

### `modules/attendance/timekeeping/timekeeping.controller.ts` (new endpoints only)

```ts
// In TimekeepingController — added 4 endpoints:

@Post("timesheets/batch")
@CheckPolicy(AttendancePolicies.timesheetManage)
@AuditLog({ action: "timesheet_batch_save", entity: "attendance" })
@ApiOperation({ summary: "Batch save attendance timesheet records" })
@ApiOkResponse({ type: BatchTimesheetResponseDto })
async batchSaveTimesheet(@Request() req: ExpressRequest & { user: AuthUser }, @Body() dto: BatchTimesheetDto): Promise<BatchTimesheetResponseDto> {
  return this.timesheetService.batchSave(req.user.id, dto);
}

@Post("period-locks/lock")
@CheckPolicy(AttendancePolicies.periodLock)
@AuditLog({ action: "period_lock_lock", entity: "attendance" })
async lockPeriod(@Request() req: ExpressRequest & { user: AuthUser }, @Body() dto: LockPeriodDto) {
  const lock = await this.periodLockService.lock(req.user.id, dto.period, dto.remarks);
  return this.toPeriodLockResponse(lock);
}

@Post("period-locks/unlock")
@CheckPolicy(AttendancePolicies.periodUnlock)
@AuditLog({ action: "period_lock_unlock", entity: "attendance" })
async unlockPeriod(@Request() req: ExpressRequest & { user: AuthUser }, @Body() dto: UnlockPeriodDto) {
  const lock = await this.periodLockService.unlock(req.user.id, dto.period, dto.remarks);
  return this.toPeriodLockResponse(lock);
}

@Get("timesheet-workspace")
@CheckPolicy(AttendancePolicies.report)
@ApiOkResponse({ type: TimesheetWorkspaceResponseDto })
async getTimesheetWorkspace(@Query() query: TimesheetWorkspaceQueryDto): Promise<TimesheetWorkspaceResponseDto> {
  return this.queryTimesheetWorkspace.execute(query);
}

@Get("period-locks/:period")
@CheckPolicy(AttendancePolicies.report)
async getPeriodLock(@Param("period") period: string): Promise<{ data: PeriodLockResponseDto | null }> {
  const lock = await this.periodLockService.getPeriodLock(period);
  return { data: lock ? this.toPeriodLockResponse(lock) : null };
}

private toPeriodLockResponse(lock: any): PeriodLockResponseDto {
  return { id: lock.id, period: lock.period, status: lock.status, lockedByUserId: lock.lockedByUserId, lockedAt: lock.lockedAt, unlockedByUserId: lock.unlockedByUserId, unlockedAt: lock.unlockedAt, remarks: lock.remarks };
}
```

### `modules/attendance/timekeeping/timekeeping.module.ts`

```ts
@Module({
  imports: [AttendancesModule],
  controllers: [TimekeepingController],
  providers: [
    AttendanceTimekeepingRepository, AttendancePeriodLockRepository,
    AttendanceTimeCalculationService, AttendanceExceptionDetectorService,
    AttendancePeriodLockService, TimesheetService, PeriodLockService,
    QueryTimesheetWorkspaceUseCase,
    CreateClockEventUseCase, CreateManualCorrectionUseCase, ListClockEventsUseCase,
    ListAttendanceExceptionsUseCase, OverrideAttendanceSummaryUseCase,
    RecomputeAttendanceDayUseCase, ResolveAttendanceExceptionUseCase,
    QueryAttendanceTimesheetUseCase,
  ],
  exports: [AttendanceTimekeepingRepository, RecomputeAttendanceDayUseCase],
})
export class TimekeepingModule {}
```

---

## 8. FE Feature Module (Phase 3)

### `features/attendance/timesheet-editor/types.ts`

```ts
const WS_URL = '/api/v1/timekeeping/timesheet-workspace';

export interface TimesheetWorkspaceEmployee {
  id: string; employeeCode: string; fullName: string; departmentName: string | null;
}

export interface TimesheetWorkspaceRecord {
  employeeId: string; workDate: string; status: string | null;
  checkIn: string | null; checkOut: string | null;
  workedMinutes: number | null; scheduledMinutes: number | null;
  lateMinutes: number | null; earlyLeaveMinutes: number | null;
  overtimeMinutes: number | null; isHoliday: boolean | null;
}

export interface TimesheetWorkspaceResponse {
  period: string; periodStatus: PeriodStatus;
  employees: TimesheetWorkspaceEmployee[]; records: TimesheetWorkspaceRecord[];
}

export type PeriodStatus = 'open' | 'locked' | 'payroll_processing' | 'payroll_posted';

export interface PeriodLockData {
  id: string; period: string; status: PeriodStatus;
  lockedByUserId: string | null; lockedAt: string | null;
  unlockedByUserId: string | null; unlockedAt: string | null;
  remarks: string | null;
}

export interface DirtyCell { checkIn: string; checkOut: string; }
export interface FailedCell { employeeId: string; workDate: string; reason: string; }
export interface BatchRecord { employeeId: string; workDate: string; checkIn: string; checkOut: string; }
export interface BatchSavePayload { period: string; records: BatchRecord[]; }
export interface BatchSaveResponse { success: number; failed: number; errors: FailedCell[]; }

export function periodFromDate(date: Date): string {
  const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
export function daysInMonth(period: string): number {
  const [y, m] = period.split('-').map(Number);
  return new Date(y!, m!, 0).getDate();
}
export function cellKey(employeeId: string, workDate: string): string {
  return `${employeeId}::${workDate}`;
}
```

### `features/attendance/timesheet-editor/hooks/use-timesheet.ts`

```ts
import { useState, useEffect, useCallback } from 'react';
import { type TimesheetWorkspaceEmployee, type TimesheetWorkspaceRecord, type TimesheetWorkspaceResponse, type PeriodStatus } from '../types';

const WS_URL = '/api/v1/timekeeping/timesheet-workspace';

export interface TimesheetState {
  loading: boolean; error: string | null;
  employees: TimesheetWorkspaceEmployee[]; records: TimesheetWorkspaceRecord[];
  periodStatus: PeriodStatus | null; period: string;
  reload: () => Promise<void>; setPeriod: (period: string) => void;
}

export function useTimesheet(initialPeriod?: string): TimesheetState {
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [period, setPeriod] = useState(initialPeriod ?? defaultPeriod);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<TimesheetWorkspaceEmployee[]>([]);
  const [records, setRecords] = useState<TimesheetWorkspaceRecord[]>([]);
  const [periodStatus, setPeriodStatus] = useState<PeriodStatus | null>(null);

  const fetchData = useCallback(async (p: string) => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ period: p });
      const res = await fetch(`${WS_URL}?${params}`);
      if (!res.ok) { setError(`Failed to load workspace: ${res.status}`); return; }
      const body = await res.json();
      const data: TimesheetWorkspaceResponse = body.data ?? body;
      setEmployees(data.employees ?? []);
      setRecords(data.records ?? []);
      setPeriodStatus(data.periodStatus ?? null);
    } catch (err: any) { setError(err?.message ?? 'Unknown error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchData(period); }, [period, fetchData]);
  const reload = useCallback(async () => { await fetchData(period); }, [period, fetchData]);
  return { loading, error, employees, records, periodStatus, period, reload, setPeriod };
}
```

### `features/attendance/timesheet-editor/hooks/use-dirty-cells.ts`

```ts
import { useState, useCallback, useRef } from 'react';
import { cellKey, type BatchRecord, type BatchSavePayload, type BatchSaveResponse, type DirtyCell, type FailedCell } from '../types';

const BATCH_URL = '/api/v1/timekeeping/timesheets/batch';

export function useDirtyCells() {
  const [dirtyCells, setDirtyCells] = useState<Map<string, DirtyCell>>(new Map());
  const [failedCells, setFailedCells] = useState<FailedCell[]>([]);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const setDirty = useCallback((employeeId: string, workDate: string, checkIn: string, checkOut: string) => {
    setDirtyCells((prev) => {
      const next = new Map(prev);
      const key = cellKey(employeeId, workDate);
      if (checkIn === '' && checkOut === '') next.delete(key);
      else next.set(key, { checkIn, checkOut });
      return next;
    });
  }, []);

  const isDirty = useCallback((employeeId: string, workDate: string) => dirtyCells.has(cellKey(employeeId, workDate)), [dirtyCells]);
  const resetDirty = useCallback(() => { setDirtyCells(new Map()); setFailedCells([]); }, []);
  const clearFailed = useCallback(() => setFailedCells([]), []);
  const dirtyCount = dirtyCells.size;

  const save = useCallback(async (period: string): Promise<BatchSaveResponse | null> => {
    if (savingRef.current || dirtyCells.size === 0) return null;
    savingRef.current = true; setSaving(true);
    try {
      const records: BatchRecord[] = [];
      dirtyCells.forEach((cell, key) => {
        const [employeeId, workDate] = key.split('::');
        records.push({ employeeId: employeeId!, workDate: workDate!, checkIn: cell.checkIn, checkOut: cell.checkOut });
      });
      const res = await fetch(BATCH_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ period, records }) });
      if (!res.ok) {
        const text = await res.text();
        return { success: 0, failed: records.length, errors: [{ employeeId: '', workDate: '', reason: text }] };
      }
      const body = await res.json();
      const result: BatchSaveResponse = body.data ?? body;
      const failedKeys = new Set(result.errors.map((e) => cellKey(e.employeeId, e.workDate)));
      setDirtyCells((prev) => { const next = new Map(prev); next.forEach((_, k) => { if (!failedKeys.has(k)) next.delete(k); }); return next; });
      setFailedCells(result.errors);
      return result;
    } finally { setSaving(false); savingRef.current = false; }
  }, [dirtyCells]);

  return { dirtyCells, dirtyCount, failedCells, saving, setDirty, isDirty, resetDirty, clearFailed, save };
}
```

### `features/attendance/timesheet-editor/hooks/use-period-lock.ts`

```ts
import { useState, useCallback } from 'react';

const LOCKS_URL = '/api/v1/timekeeping/period-locks';

export function usePeriodLock() {
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  const lock = useCallback(async (period: string, remarks?: string): Promise<boolean> => {
    setLocking(true); setLockError(null);
    try {
      const res = await fetch(`${LOCKS_URL}/lock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ period, remarks }) });
      if (!res.ok) { setLockError(await res.text()); return false; }
      return true;
    } catch (err: any) { setLockError(err?.message ?? 'Failed'); return false; }
    finally { setLocking(false); }
  }, []);

  const unlock = useCallback(async (period: string, remarks: string): Promise<boolean> => {
    setLocking(true); setLockError(null);
    try {
      const res = await fetch(`${LOCKS_URL}/unlock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ period, remarks }) });
      if (!res.ok) { setLockError(await res.text()); return false; }
      return true;
    } catch (err: any) { setLockError(err?.message ?? 'Failed'); return false; }
    finally { setLocking(false); }
  }, []);

  return { lock, unlock, locking, lockError, clearLockError: () => setLockError(null) };
}
```

### `features/attendance/timesheet-editor/hooks/use-fill-handler.ts`

```ts
import { useState, useCallback, useRef } from 'react';

interface FillState { sourceDate: string; field: 'checkIn' | 'checkOut'; value: string; }

export function useFillHandler(
  employeeId: string, canEdit: boolean,
  onCellChange: (employeeId: string, workDate: string, checkIn: string, checkOut: string) => void,
) {
  const [fillRange, setFillRange] = useState<{ from: number; to: number } | null>(null);
  const fillRef = useRef<FillState | null>(null);

  const onFillStart = useCallback((date: string, field: 'checkIn' | 'checkOut', value: string) => {
    if (!canEdit || !value) return;
    fillRef.current = { sourceDate: date, field, value };
    setFillRange({ from: parseInt(date.split('-').pop()!, 10), to: parseInt(date.split('-').pop()!, 10) });
  }, [canEdit]);

  const onFillMove = useCallback((day: number) => {
    if (!fillRef.current) return;
    setFillRange((prev) => prev ? { from: prev.from, to: day } : { from: day, to: day });
  }, []);

  const onFillEnd = useCallback((allDays: number, period: string) => {
    const state = fillRef.current;
    fillRef.current = null; setFillRange(null);
    if (!state) return;
    const startDay = parseInt(state.sourceDate.split('-').pop()!, 10);
    for (let d = startDay; d <= allDays; d++) {
      const wd = `${period}-${String(d).padStart(2, '0')}`;
      if (state.field === 'checkIn') onCellChange(employeeId, wd, state.value, '');
      else onCellChange(employeeId, wd, '', state.value);
    }
  }, [employeeId, onCellChange]);

  return { fillRange, isInRange: (day: number) => fillRange ? day >= Math.min(fillRange.from, fillRange.to) && day <= Math.max(fillRange.from, fillRange.to) : false, onFillStart, onFillMove, onFillEnd };
}
```

### `features/attendance/timesheet-editor/timesheet-editor-page.tsx`

```tsx
'use client';

import * as React from 'react';
import { useTimesheet } from './hooks/use-timesheet';
import { useDirtyCells } from './hooks/use-dirty-cells';
import { usePeriodLock } from './hooks/use-period-lock';
import { useFillHandler } from './hooks/use-fill-handler';
import { daysInMonth, cellKey } from './types';
import type { TimesheetWorkspaceRecord } from './types';

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; } catch { return ''; }
}

function dayDate(period: string, day: number): string { return `${period}-${String(day).padStart(2, '0')}`; }
function getDayOfWeek(dateStr: string): number { return new Date(dateStr + 'T00:00:00').getDay(); }
const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
function getRecord(records: TimesheetWorkspaceRecord[], employeeId: string, workDate: string) { return records.find((r) => r.employeeId === employeeId && r.workDate === workDate); }

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  present: { text: '✓', color: 'text-emerald-400' },
  late: { text: '⚠', color: 'text-amber-400' },
  early_leave: { text: '⚡', color: 'text-amber-400' },
  absent: { text: '—', color: 'text-red-400' },
  leave: { text: 'L', color: 'text-blue-400' },
  holiday: { text: 'H', color: 'text-indigo-400' },
  off: { text: 'OFF', color: 'text-slate-500' },
};

// Modals omitted for brevity (LockModal, UnlockModal — full source in codebase)

function TimesheetDetail({ employeeId, records, period, dirtyCells, canEdit, onCellChange }: {
  employeeId: string; records: TimesheetWorkspaceRecord[]; period: string;
  dirtyCells: Map<string, { checkIn: string; checkOut: string }>; canEdit: boolean;
  onCellChange: (employeeId: string, workDate: string, checkIn: string, checkOut: string) => void;
}) {
  const days = daysInMonth(period);
  const fill = useFillHandler(employeeId, canEdit, onCellChange);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rows: React.ReactNode[] = [];
  let filled = 0;

  for (let d = 1; d <= days; d++) {
    const wd = dayDate(period, d);
    const record = getRecord(records, employeeId, wd);
    const key = cellKey(employeeId, wd);
    const dirty = dirtyCells.get(key);
    const dow = getDayOfWeek(wd);
    const isWeekend = dow === 0 || dow === 6;
    const isToday = wd === new Date().toISOString().slice(0, 10);
    const hasData = record?.status && !['absent', 'leave', 'holiday', 'off'].includes(record.status);
    if (hasData) filled++;
    const statusInfo = record?.status ? STATUS_LABEL[record.status] : null;
    const isDirty = Boolean(dirty);
    const defaultIn = dirty?.checkIn ?? (record?.checkIn ? formatTime(record.checkIn) : '');
    const defaultOut = dirty?.checkOut ?? (record?.checkOut ? formatTime(record.checkOut) : '');
    const [localIn, setLocalIn] = React.useState(defaultIn);
    const [localOut, setLocalOut] = React.useState(defaultOut);
    const [focused, setFocused] = React.useState(false);
    React.useEffect(() => {
      if (!focused) { setLocalIn(dirty?.checkIn ?? (record?.checkIn ? formatTime(record.checkIn) : '')); setLocalOut(dirty?.checkOut ?? (record?.checkOut ? formatTime(record.checkOut) : '')); }
    }, [dirty, focused, record?.checkIn, record?.checkOut]);
    const bg = isDirty ? 'bg-emerald-950/20 border-y border-emerald-500/20' : isToday ? 'bg-slate-800/40' : isWeekend ? 'bg-slate-800/10' : '';
    rows.push(<tr key={wd} className={`border-b border-slate-800/40 ${bg}`}>
      <td className="px-3 py-2 text-xs text-slate-400">{d}</td>
      <td className="px-3 py-2 text-xs text-slate-500">{DAY_LABELS[dow]}</td>
      <td className="px-3 py-2">{statusInfo ? <span className={`text-xs font-semibold ${statusInfo.color}`}>{statusInfo.text}</span> : <span className="text-xs text-slate-600">—</span>}</td>
      {canEdit ? <>
        <td className="px-2 py-1.5"><div className="group/input relative inline-flex">
          <input type="text" inputMode="numeric" value={localIn} onChange={(e) => { const v = e.target.value.replace(/[^0-9:]/g, '').slice(0,5); if (/^\d{0,2}:?\d{0,2}$/.test(v)) setLocalIn(v); }} onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); onCellChange(employeeId, wd, localIn, localOut); }} placeholder="HH:mm"
            className={`w-16 rounded border px-1.5 py-1 text-xs font-mono ${isDirty ? 'border-emerald-500/40 bg-slate-800' : 'border-transparent bg-transparent'} text-slate-200 focus:border-blue-500/50 focus:bg-slate-800 focus:outline-none`} />
          {canEdit && localIn && <span onMouseDown={() => fill.onFillStart(wd, 'checkIn', localIn)} className="absolute -bottom-0.5 -right-0.5 z-10 h-2 w-2 cursor-ns-resize rounded-sm border border-emerald-400/60 bg-emerald-500/40 opacity-0 hover:opacity-100 group-hover/input:opacity-60" />}
        </div></td>
        <td className="px-2 py-1.5"><div className="group/input relative inline-flex">
          <input type="text" inputMode="numeric" value={localOut} onChange={(e) => { const v = e.target.value.replace(/[^0-9:]/g, '').slice(0,5); if (/^\d{0,2}:?\d{0,2}$/.test(v)) setLocalOut(v); }} onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); onCellChange(employeeId, wd, localIn, localOut); }} placeholder="HH:mm"
            className={`w-16 rounded border px-1.5 py-1 text-xs font-mono ${isDirty ? 'border-emerald-500/40 bg-slate-800' : 'border-transparent bg-transparent'} text-slate-400 focus:border-blue-500/50 focus:bg-slate-800 focus:outline-none`} />
          {canEdit && localOut && <span onMouseDown={() => fill.onFillStart(wd, 'checkOut', localOut)} className="absolute -bottom-0.5 -right-0.5 z-10 h-2 w-2 cursor-ns-resize rounded-sm border border-emerald-400/60 bg-emerald-500/40 opacity-0 hover:opacity-100 group-hover/input:opacity-60" />}
        </div></td>
      </> : <>
        <td className="px-3 py-2 text-xs text-slate-500">—</td>
        <td className="px-3 py-2 text-xs text-slate-500">—</td>
      </>}
      <td className="px-3 py-2 text-xs text-slate-500">{record?.workedMinutes ? `${Math.floor(record.workedMinutes / 60)}h${record.workedMinutes % 60}m` : ''}</td>
    </tr>);
  }

  return <div ref={containerRef} className="relative"
    onMouseMove={(e) => { if (!fill.fillRange || !containerRef.current) return; const rect = containerRef.current.getBoundingClientRect(); const targetDay = Math.min(days, Math.max(1, Math.floor((e.clientY - rect.top - 36) / 36) + 1)); fill.onFillMove(targetDay); }}
    onMouseUp={() => fill.onFillEnd(days, period)}
    onMouseLeave={() => { if (fill.fillRange) fill.onFillEnd(days, period); }}>
    <table className="w-full border-collapse">
      <thead><tr className="sticky top-0 bg-slate-800/90 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Day</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Check-in</th><th className="px-3 py-2">Check-out</th><th className="px-3 py-2">Worked</th>
      </tr></thead>
      <tbody>{rows}</tbody>
    </table>
  </div>;
}

export function TimesheetEditorPage({ defaultPeriod }: { defaultPeriod?: string }) {
  const ts = useTimesheet(defaultPeriod);
  const dc = useDirtyCells();
  const pl = usePeriodLock();
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [deptFilter, setDeptFilter] = React.useState('');
  const [showLock, setShowLock] = React.useState(false);
  const [showUnlock, setShowUnlock] = React.useState(false);
  const canEdit = ts.periodStatus === 'open';
  const canLock = ts.periodStatus === 'open';
  const canUnlock = ts.periodStatus === 'locked';
  const days = daysInMonth(ts.period);

  const employeeMap = React.useMemo(() => {
    const m = new Map<string, { id: string; code: string; name: string; dept: string | null }>();
    for (const emp of ts.employees) m.set(emp.id, { id: emp.id, code: emp.employeeCode, name: emp.fullName, dept: emp.departmentName });
    return m;
  }, [ts.employees]);

  const employees = React.useMemo(() => {
    let list = Array.from(employeeMap.values());
    if (search) { const q = search.toLowerCase(); list = list.filter((e) => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q)); }
    if (deptFilter) list = list.filter((e) => e.dept === deptFilter);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [employeeMap, search, deptFilter]);

  const departments = React.useMemo(() => Array.from(new Set(Array.from(employeeMap.values()).map((e) => e.dept).filter(Boolean))).sort(), [employeeMap]);

  const employeeFilled = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const r of ts.records) { if (r.status && !['absent', 'leave', 'holiday', 'off'].includes(r.status)) m.set(r.employeeId, (m.get(r.employeeId) ?? 0) + 1); }
    return m;
  }, [ts.records]);

  const selectedProgress = selectedEmployeeId ? employeeFilled.get(selectedEmployeeId) ?? 0 : 0;
  const handleCellChange = React.useCallback((employeeId: string, workDate: string, checkIn: string, checkOut: string) => dc.setDirty(employeeId, workDate, checkIn, checkOut), [dc]);
  const handleSave = React.useCallback(async () => { const r = await dc.save(ts.period); if (r) ts.reload(); }, [dc, ts]);
  const handleLock = React.useCallback(async (remarks: string) => { const ok = await pl.lock(ts.period, remarks); if (ok) ts.reload(); setShowLock(false); }, [pl, ts]);
  const handleUnlock = React.useCallback(async (remarks: string) => { const ok = await pl.unlock(ts.period, remarks); if (ok) ts.reload(); setShowUnlock(false); }, [pl, ts]);
  React.useEffect(() => { if (!selectedEmployeeId && employees.length > 0) setSelectedEmployeeId(employees[0]!.id); }, [employees, selectedEmployeeId]);

  if (ts.loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" /><span className="ml-3 text-sm text-slate-400">Loading...</span></div>;
  if (ts.error) return <div className="rounded-lg border border-red-800/40 bg-red-950/20 p-6 text-center"><p className="text-sm text-red-400">{ts.error}</p><button type="button" onClick={ts.reload} className="mt-3 rounded-md bg-slate-800 px-4 py-1.5 text-sm text-slate-300">Retry</button></div>;

  const selected = selectedEmployeeId ? employeeMap.get(selectedEmployeeId) : null;

  return (<div className="flex min-h-0 flex-1 flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => { const [y, m] = ts.period.split('-').map(Number); const d = new Date(y!, m!-1, 1); d.setMonth(d.getMonth()-1); ts.setPeriod(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); }} className="rounded-md border border-slate-700/50 bg-slate-800/60 px-2.5 py-1 text-sm hover:bg-slate-700/60">◀</button>
        <span className="min-w-[7rem] text-center text-lg font-bold text-slate-100">{ts.period}</span>
        <button type="button" onClick={() => { const [y, m] = ts.period.split('-').map(Number); const d = new Date(y!, m!-1, 1); d.setMonth(d.getMonth()+1); ts.setPeriod(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); }} className="rounded-md border border-slate-700/50 bg-slate-800/60 px-2.5 py-1 text-sm hover:bg-slate-700/60">▶</button>
      </div>
      <span className={`rounded-full border border-slate-700/50 bg-slate-800/60 px-3 py-1 text-xs font-semibold ${ts.periodStatus === 'open' ? 'text-emerald-400' : ts.periodStatus === 'locked' ? 'text-amber-400' : ts.periodStatus === 'payroll_processing' ? 'text-blue-400' : 'text-slate-400'}`}>{ts.periodStatus?.toUpperCase() ?? 'UNKNOWN'}</span>
      <div className="flex items-center gap-2">
        {dc.dirtyCount > 0 && <span className="text-xs text-slate-400">{dc.dirtyCount} modified</span>}
        {canEdit && <button type="button" onClick={handleSave} disabled={dc.saving || dc.dirtyCount === 0} className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-emerald-500">{dc.saving ? 'Saving...' : `Save Changes (${dc.dirtyCount})`}</button>}
        {canLock && <button type="button" onClick={() => setShowLock(true)} className="rounded-md bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-500">Lock Period</button>}
        {canUnlock && <button type="button" onClick={() => setShowUnlock(true)} className="rounded-md border border-rose-600/50 bg-rose-950/30 px-4 py-1.5 text-sm font-semibold text-rose-400 hover:bg-rose-950/50">Unlock</button>}
      </div>
    </div>

    {/* Company Progress */}
    {(() => {
      const total = employees.length; const completed = employees.filter((e) => (employeeFilled.get(e.id) ?? 0) === days).length;
      const inProgress = employees.filter((e) => { const f = employeeFilled.get(e.id) ?? 0; return f > 0 && f < days; }).length;
      const notStarted = total - completed - inProgress; const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      return total > 0 ? <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-800/60 bg-slate-900/60 px-4 py-3">
        <div className="flex items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{ts.period}</span><div className="h-2 w-48 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div><span className="text-xs font-bold text-slate-300">{pct}%</span></div>
        <div className="flex gap-4 text-xs"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{completed} completed</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />{inProgress} in progress</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-600" />{notStarted} not started</span></div>
      </div> : null;
    })()}

    <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
      <div className="flex w-72 shrink-0 flex-col rounded-lg border border-slate-800/60 bg-slate-900/60">
        <div className="border-b border-slate-800/60 p-3">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee..." className="mb-2 w-full rounded-md border border-slate-700/50 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500" />
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="w-full rounded-md border border-slate-700/50 bg-slate-800 px-3 py-1.5 text-xs text-slate-200"><option value="">All departments</option>{departments.map((d) => <option key={d} value={d}>{d}</option>)}</select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {employees.map((emp) => {
            const filled = employeeFilled.get(emp.id) ?? 0; const pct = days > 0 ? Math.round((filled / days) * 100) : 0;
            const isSelected = emp.id === selectedEmployeeId;
            return <button key={emp.id} type="button" onClick={() => setSelectedEmployeeId(emp.id)}
              className={`flex w-full items-center gap-2 border-b border-slate-800/40 px-3 py-2 text-left text-sm transition-colors ${isSelected ? 'bg-emerald-950/30 border-l-2 border-l-emerald-500' : 'hover:bg-slate-800/40'}`}>
              <span className="flex-1 truncate min-w-0"><span className="block text-slate-200">{emp.name}</span><span className="block text-[10px] text-slate-500">{emp.code}{emp.dept ? ` · ${emp.dept}` : ''}</span></span>
              <span className="flex flex-col items-end gap-0.5">
                <span className={`shrink-0 text-xs font-semibold ${pct === 100 ? 'text-emerald-400' : pct > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{filled}/{days}</span>
                <span className={`text-[9px] font-medium uppercase ${pct === 100 ? 'text-emerald-500' : pct > 0 ? 'text-amber-500' : 'text-slate-600'}`}>{pct === 100 ? 'COMPLETE' : pct > 0 ? 'IN PROGRESS' : 'NOT STARTED'}</span>
              </span>
            </button>;
          })}
          {employees.length === 0 && <div className="px-3 py-8 text-center text-xs text-slate-500">No employees found</div>}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-800/60 bg-slate-900/60">
        {selected ? <>
          <div className="flex items-center justify-between border-b border-slate-800/60 px-4 py-3">
            <div><h3 className="font-bold text-slate-100">{selected.name}</h3><p className="text-xs text-slate-500">{selected.code}{selected.dept ? ` · ${selected.dept}` : ''}</p></div>
            <div className="flex items-center gap-2"><span className="text-xs text-slate-400">Progress</span><div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: days > 0 ? `${(selectedProgress / days) * 100}%` : '0%' }} /></div><span className="text-xs text-slate-400">{selectedProgress}/{days}</span></div>
          </div>
          <div className="flex-1 overflow-auto">
            <TimesheetDetail employeeId={selected.id} records={ts.records} period={ts.period} dirtyCells={dc.dirtyCells} canEdit={canEdit} onCellChange={handleCellChange} />
          </div>
        </> : <div className="flex items-center justify-center flex-1 text-sm text-slate-500">Select an employee</div>}
      </div>
    </div>
    {dc.failedCells.length > 0 && <div className="rounded-lg border border-red-800/40 bg-red-950/20 p-4">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-red-400">Failed ({dc.failedCells.length})</h4>
      {dc.failedCells.map((f, i) => <p key={i} className="text-xs text-slate-400">{f.employeeId.slice(0,8)} · {f.workDate} — {f.reason}</p>)}
    </div>}
  </div>);
}
```

---

## 9. Routes + Layout

### `app/(protected)/attendance/management/timesheet/page.tsx`

```tsx
import { TimesheetEditorPage } from '@/features/attendance';
import { requireServerSession } from '@/lib/server/auth-session';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default async function TimesheetPage() {
  await requireServerSession();
  return <Suspense fallback={<Skeleton className='h-[400px] w-full' />}><TimesheetEditorPage /></Suspense>;
}
```

### `app/(protected)/attendance/layout.tsx`

```tsx
'use client';
import * as React from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { DomainHeader } from '@/components/layout/domain-header';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission, hasAnyPermission } from '@project/permissions';
import { permissions } from '@/lib/permissions';

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  if (!initialized) return <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'><div className='h-10 w-full animate-pulse rounded bg-muted' /></div>;

  const canViewAll = hasPermission(user?.permissions ?? [], permissions.attendance.viewAll);
  const canViewDepartment = hasPermission(user?.permissions ?? [], permissions.attendance.viewDepartment);
  const canAdmin = canViewAll || canViewDepartment;
  const canTimesheet = hasAnyPermission(user?.permissions ?? [], ['attendance:timesheet:view', 'attendance:timesheet:manage']);

  const tabs = [
    { href: '/attendance', label: 'Chấm công của tôi' },
    { href: '/attendance/history', label: 'Lịch sử chấm công' },
    { href: '/attendance/summary', label: 'Tổng hợp công', adminOnly: true },
    { href: '/attendance/management', label: 'Quản lý chấm công', adminOnly: true },
    { href: '/attendance/analytics', label: 'Báo cáo & Phân tích', adminOnly: true },
    { href: '/attendance/management/timesheet', label: 'Timesheet', visible: canTimesheet },
  ];
  const visibleTabs = tabs.filter((tab: any) => { if ('visible' in tab) return tab.visible; if (tab.adminOnly) return canAdmin; return true; }).map(({ href, label }) => ({ href, label } as const));

  return <div className='flex min-h-0 flex-1 flex-col'>
    <DomainHeader tabs={visibleTabs} />
    <div className='flex min-h-0 flex-1 flex-col p-4 md:px-6'>
      <ErrorBoundary feature='attendance'>{children}</ErrorBoundary>
    </div>
  </div>;
}
```

---

## 10. Nav Config

### `config/nav-config.ts` (attendance section)

```ts
{
  label: appCopy.nav.groups.attendance,
  items: [{
    title: appCopy.nav.items.attendance,
    url: '/attendance',
    icon: 'calendar',
    access: { permissions: ['attendance:view:self', 'attendance:view:department', 'attendance:view:all'] }
  }]
}
```

Timesheet route `/attendance/management/timesheet` is **NOT** registered in nav-config — accessed via tab in `AttendanceLayout`.

---

## Summary

| Layer | Files | Status |
|-------|-------|--------|
| DB Schema | 4 files (enums, constants, tables, migration) | ✅ |
| Domain Service + Repo | 3 files (period-lock service, repo, lock service) | ✅ |
| Permission Codes | 3 files (package, registry, policy) | ✅ |
| DTOs | 2 files (timesheet.dto, timesheet-workspace.dto) | ✅ |
| TimesheetService (batch) | 1 file | ✅ |
| Workspace Query Use Case | 1 file | ✅ |
| Controller + Module | 2 files | ✅ |
| FE Hooks | 4 files (timesheet, dirty-cells, period-lock, fill-handler) | ✅ |
| FE Component | 2 files (page, toolbar) + barrel export | ✅ |
| Routes + Layout | 3 files (page, layout, nav-config) | ✅ |

File at `features/attendance/timesheet-editor/AUDIT_TIMESHEET.md`
