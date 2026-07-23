import { ConflictException } from "@nestjs/common";
import {
  CancelEmployeeShiftAssignmentUseCase,
  CreateEmployeeShiftAssignmentUseCase,
} from "../schedule-roster/use-cases/assignments/employee-shift-assignment.usecases";
import {
  ApproveShiftRosterUseCase,
  PublishShiftRosterUseCase,
  QueryShiftRosterUseCase,
  RejectShiftRosterUseCase,
  SubmitShiftRosterForApprovalUseCase,
} from "../schedule-roster/use-cases/roster/shift-roster.usecases";
import {
  ArchiveWorkforceShiftTemplateUseCase,
  CreateWorkforceShiftTemplateUseCase,
  UpdateWorkforceShiftTemplateUseCase,
} from "../shift-catalog/use-cases/workforce-shift-template.usecases";
import { RosterExpansionService } from "../schedule-roster/services/roster-expansion.service";
import { ShiftRosterLifecycleService } from "../schedule-roster/services/shift-roster-lifecycle.service";
import { ShiftRosterLockService } from "../schedule-roster/services/shift-roster-lock.service";
import { type WorkforceShiftsRepository } from "../schedule-roster/repositories/workforce-shifts.repository";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

type TemplateRow = any;
type AssignmentRow = any;
type PublicationRow = any;
type HistoryRow = any;

class InMemoryWorkforceShiftsRepository {
  private templateSeq = 0;
  private assignmentSeq = 0;
  private publicationSeq = 0;
  private historySeq = 0;
  private templates: TemplateRow[] = [];
  private assignments: AssignmentRow[] = [];
  private publications: PublicationRow[] = [];
  private history: HistoryRow[] = [];

  async transaction<T>(callback: (tx: this) => Promise<T>): Promise<T> {
    return callback(this);
  }

  private readonly employees = {
    empA: {
      id: "empA",
      employeeCode: "E-001",
      firstName: "Alice",
      lastName: "Tran",
      departmentId: "dep-1",
    },
    empB: {
      id: "empB",
      employeeCode: "E-002",
      firstName: "Bob",
      lastName: "Nguyen",
      departmentId: "dep-2",
    },
  } as Record<string, any>;

  async findShiftTemplateById(id: string): Promise<any | null> {
    return this.templates.find((row) => row.id === id) ?? null;
  }

  async listShiftTemplates(query: any) {
    let rows = [...this.templates];
    if (query.status) {
      rows = rows.filter((row) => row.status === query.status);
    }
    return { rows, total: rows.length, page: 1, limit: 20 };
  }

  async createShiftTemplate(values: any): Promise<any> {
    const row = {
      id: `tpl-${++this.templateSeq}`,
      branchId: values.branchId ?? "branch-1",
      locationId: values.locationId ?? null,
      code: values.code,
      name: values.name,
      startTime: values.startTime,
      endTime: values.endTime,
      breakMinutes: values.breakMinutes ?? 0,
      workDays: values.workDays ?? [],
      isNightShift: values.isNightShift ?? false,
      status: values.status ?? "draft",
      version: values.version ?? 1,
      isActive: values.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.templates.push(row);
    return row;
  }

  async updateShiftTemplate(id: string, values: any): Promise<any> {
    const row = this.templates.find((item) => item.id === id);
    Object.assign(row, values, { updatedAt: new Date() });
    return row;
  }

  async findShiftAssignmentById(id: string): Promise<any | null> {
    const row = this.assignments.find((item) => item.id === id);
    if (!row) return null;
    return this.hydrateAssignment(row);
  }

  async listShiftAssignments(query: any) {
    let rows = [...this.assignments];
    if (query.employeeId) {
      rows = rows.filter((row) => row.employeeId === query.employeeId);
    }
    return {
      rows: rows.map((row) => this.hydrateAssignment(row)),
      total: rows.length,
      page: 1,
      limit: 20,
    };
  }

  async listEmployeeAssignmentsForConflict(
    employeeId: string,
    excludeId?: string,
  ): Promise<any[]> {
    return this.assignments
      .filter(
        (row) =>
          row.employeeId === employeeId &&
          row.status !== "cancelled" &&
          row.id !== excludeId,
      )
      .map((row) => ({
        effectiveFrom: row.effectiveFrom,
        effectiveTo: row.effectiveTo,
      }));
  }

  async createShiftAssignment(values: any): Promise<any> {
    const row = {
      id: `asg-${++this.assignmentSeq}`,
      employeeId: values.employeeId,
      shiftTemplateId: values.shiftTemplateId ?? null,
      locationId: values.locationId ?? null,
      assignmentDate: values.assignmentDate,
      effectiveFrom: values.effectiveFrom,
      effectiveTo: values.effectiveTo ?? null,
      status: values.status ?? "planned",
      note: values.note ?? null,
      cancelledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.assignments.push(row);
    return row;
  }

  async updateShiftAssignment(id: string, values: any, expectedVersion?: number): Promise<any> {
    const row = this.assignments.find((item) => item.id === id);
    if (!row) return null;
    if (expectedVersion !== undefined && row.version !== expectedVersion) {
      return null;
    }
    Object.assign(row, values, {
      version: (row.version ?? 1) + 1,
      updatedAt: new Date()
    });
    return row;
  }

  async listRosterRows(query: any): Promise<any[]> {
    return this.assignments
      .filter((row) => row.status !== "cancelled")
      .filter((row) => !query.employeeId || row.employeeId === query.employeeId)
      .map((row) => this.hydrateAssignment(row))
      .filter(
        (row) =>
          !query.departmentId ||
          row.employee?.departmentId === query.departmentId,
      );
  }

  async upsertRosterPublication(values: any): Promise<any> {
    const existing = this.publications.find(
      (row) =>
        row.branchId === (values.branchId ?? null) &&
        row.departmentId === (values.departmentId ?? null) &&
        row.periodStart === values.periodStart &&
        row.periodEnd === values.periodEnd,
    );

    if (existing) {
      Object.assign(existing, values, { updatedAt: new Date() });
      return existing;
    }

    const row = {
      id: `pub-${++this.publicationSeq}`,
      branchId: values.branchId ?? null,
      departmentId: values.departmentId ?? null,
      periodStart: values.periodStart,
      periodEnd: values.periodEnd,
      status: values.status ?? "draft",
      submittedAt: values.submittedAt ?? null,
      submittedByUserId: values.submittedByUserId ?? null,
      approvedAt: values.approvedAt ?? null,
      approvedByUserId: values.approvedByUserId ?? null,
      rejectedAt: values.rejectedAt ?? null,
      rejectedByUserId: values.rejectedByUserId ?? null,
      rejectionReason: values.rejectionReason ?? null,
      publishedAt: values.publishedAt ?? null,
      publishedByUserId: values.publishedByUserId ?? null,
      lockedAt: values.lockedAt ?? null,
      lockedByUserId: values.lockedByUserId ?? null,
      version: values.version ?? 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.publications.push(row);
    return row;
  }

  async findRosterPublication(query: any): Promise<any | null> {
    return (
      this.publications.find(
        (row) =>
          row.branchId === (query.branchId ?? null) &&
          row.departmentId === (query.departmentId ?? null) &&
          row.periodStart === query.from &&
          row.periodEnd === query.to,
      ) ?? null
    );
  }

  async ensureRosterPublication(scope: any): Promise<any> {
    const existing = await this.findRosterPublication(scope);
    if (existing) {
      return existing;
    }

    return this.upsertRosterPublication({
      branchId: scope.branchId ?? null,
      departmentId: scope.departmentId ?? null,
      periodStart: scope.from,
      periodEnd: scope.to,
      status: "draft",
      version: 1,
    });
  }

  async createRosterLifecycleHistory(values: any): Promise<any> {
    const row = {
      id: `hist-${++this.historySeq}`,
      ...values,
      createdAt: new Date(),
    };
    this.history.push(row);
    return row;
  }

  async findBlockingRosterPublication(scope: any): Promise<any | null> {
    return (
      this.publications.find(
        (row) =>
          row.branchId === (scope.branchId ?? null) &&
          (!scope.departmentId || row.departmentId === scope.departmentId) &&
          row.periodStart <= scope.to &&
          row.periodEnd >= scope.from &&
          ["pending_approval", "approved", "published_locked"].includes(row.status),
      ) ?? null
    );
  }

  async findLocationById(id: string): Promise<any | null> {
    return { id, name: "Location " + id };
  }

  private snapshots: any[] = [];
  async createRosterVersionSnapshot(values: any): Promise<any> {
    const row = {
      id: `snap-${this.snapshots.length + 1}`,
      ...values,
      createdAt: new Date(),
    };
    this.snapshots.push(row);
    return row;
  }

  async findRosterVersionSnapshots(rosterPublicationId: string): Promise<any[]> {
    return this.snapshots.filter(s => s.rosterPublicationId === rosterPublicationId);
  }

  async getEmployeeActiveAssignmentsByDateRange(
    employeeId: string,
    from: string,
    to: string
  ): Promise<any[]> {
    return this.assignments
      .filter(
        (row) =>
          row.employeeId === employeeId &&
          row.status !== "cancelled" &&
          row.assignmentDate >= from &&
          row.assignmentDate <= to
      )
      .map((row) => this.hydrateAssignment(row));
  }

  private hydrateAssignment(row: AssignmentRow) {
    return {
      ...row,
      employee: this.employees[row.employeeId] ?? null,
      shiftTemplate: row.shiftTemplateId
        ? (this.templates.find((item) => item.id === row.shiftTemplateId) ??
          null)
        : null,
    };
  }
}

class MockShiftValidationService {
  constructor(private readonly repo: any) {}

  async validateAssignment(employeeId: string, target: any): Promise<any[]> {
    const existing = await this.repo.listEmployeeAssignmentsForConflict(employeeId, target.id);
    const targetStart = new Date(`${target.date}T00:00:00.000Z`);
    const conflict = existing.some((row: any) => {
      const rowStart = new Date(`${row.effectiveFrom}T00:00:00.000Z`);
      const rowEnd = row.effectiveTo ? new Date(`${row.effectiveTo}T00:00:00.000Z`) : null;
      return rowEnd ? rowEnd >= targetStart : true;
    });

    return [
      { success: !conflict, ruleName: "NoOverlappingShifts", message: "Overlap" },
      { success: true, ruleName: "MinimumRestPeriod" },
      { success: true, ruleName: "MaxWeeklyHours" },
      { success: true, ruleName: "MaxConsecutiveDays" }
    ];
  }
}

describe("workforce shifts use-case integration", () => {
  let repo: InMemoryWorkforceShiftsRepository;
  let createTemplate: CreateWorkforceShiftTemplateUseCase;
  let updateTemplate: UpdateWorkforceShiftTemplateUseCase;
  let archiveTemplate: ArchiveWorkforceShiftTemplateUseCase;
  let createAssignment: CreateEmployeeShiftAssignmentUseCase;
  let cancelAssignment: CancelEmployeeShiftAssignmentUseCase;
  let submitRoster: SubmitShiftRosterForApprovalUseCase;
  let approveRoster: ApproveShiftRosterUseCase;
  let rejectRoster: RejectShiftRosterUseCase;
  let publishRoster: PublishShiftRosterUseCase;
  let queryRoster: QueryShiftRosterUseCase;

  beforeEach(() => {
    repo = new InMemoryWorkforceShiftsRepository();
    const lifecycle = new ShiftRosterLifecycleService();
    const lockService = new ShiftRosterLockService(
      repo as unknown as WorkforceShiftsRepository,
    );

    createTemplate = new CreateWorkforceShiftTemplateUseCase(
      repo as unknown as WorkforceShiftsRepository,
    );
    updateTemplate = new UpdateWorkforceShiftTemplateUseCase(
      repo as unknown as WorkforceShiftsRepository,
    );
    archiveTemplate = new ArchiveWorkforceShiftTemplateUseCase(
      repo as unknown as WorkforceShiftsRepository,
    );

    const eventOutbox = { stage: jest.fn().mockResolvedValue(undefined) } as any;

    createAssignment = new CreateEmployeeShiftAssignmentUseCase(
      repo as unknown as WorkforceShiftsRepository,
      new MockShiftValidationService(repo) as any,
      lockService,
      eventOutbox,
    );
    cancelAssignment = new CancelEmployeeShiftAssignmentUseCase(
      repo as unknown as WorkforceShiftsRepository,
      lockService,
      eventOutbox,
    );

    submitRoster = new SubmitShiftRosterForApprovalUseCase(
      repo as unknown as WorkforceShiftsRepository,
      lifecycle,
      eventOutbox,
    );
    approveRoster = new ApproveShiftRosterUseCase(
      repo as unknown as WorkforceShiftsRepository,
      lifecycle,
      eventOutbox,
    );
    rejectRoster = new RejectShiftRosterUseCase(
      repo as unknown as WorkforceShiftsRepository,
      lifecycle,
      eventOutbox,
    );
    publishRoster = new PublishShiftRosterUseCase(
      repo as unknown as WorkforceShiftsRepository,
      lifecycle,
      eventOutbox,
    );
    queryRoster = new QueryShiftRosterUseCase(
      repo as unknown as WorkforceShiftsRepository,
      new RosterExpansionService(),
    );
  });

  it("supports template create, update, and archive lifecycle", async () => {
    const template = await createTemplate.execute({
      code: "S-MORNING",
      name: "Morning",
      startTime: "08:00",
      endTime: "17:00",
      breakMinutes: 60,
      overnight: false,
      activeWeekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    });

    const updated = await updateTemplate.execute(template.id, {
      name: "Morning Updated",
    });
    expect(updated.name).toBe("Morning Updated");

    const archived = await archiveTemplate.execute(template.id);
    expect(archived.status).toBe("archived");
    expect(archived.isActive).toBe(false);
  });

  it("rejects overlapping assignments and supports cancel lifecycle", async () => {
    const template = await createTemplate.execute({
      code: "S-DAY",
      name: "Day",
      startTime: "08:00",
      endTime: "16:00",
      overnight: false,
      activeWeekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    });

    const first = await createAssignment.execute({
      employeeId: "empA",
      shiftTemplateId: template.id,
      positionId: "pos-1",
      effectiveFrom: "2026-04-01",
      effectiveTo: "2026-04-10",
    });
    expect(first.status).toBe("planned");

    await expect(
      createAssignment.execute({
        employeeId: "empA",
        shiftTemplateId: template.id,
        positionId: "pos-1",
        effectiveFrom: "2026-04-05",
        effectiveTo: "2026-04-12",
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    try {
      await createAssignment.execute({
        employeeId: "empA",
        shiftTemplateId: template.id,
        positionId: "pos-1",
        effectiveFrom: "2026-04-05",
        effectiveTo: "2026-04-12",
      });
    } catch (error: any) {
      expect(error.getResponse().error).toBe(ERROR_CODES.SCHEDULE_CONFLICT);
    }

    const cancelled = await cancelAssignment.execute(first.id, {
      cancelFrom: "2026-04-08",
      reason: "Leave request approved",
    });
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.effectiveTo).toBe("2026-04-08");
  });

  it("supports roster approval lifecycle and publish lock", async () => {
    const template = await createTemplate.execute({
      code: "S-NIGHT",
      name: "Night",
      startTime: "22:00",
      endTime: "06:00",
      overnight: true,
      activeWeekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    });

    await createAssignment.execute({
      employeeId: "empA",
      shiftTemplateId: template.id,
      positionId: "pos-1",
      effectiveFrom: "2026-04-01",
      effectiveTo: "2026-04-30",
      status: "published",
    });

    const submitted = await submitRoster.execute({
      branchId: "branch-1",
      departmentId: "dep-1",
      from: "2026-04-14",
      to: "2026-04-15",
      submittedByUserId: "user-1",
    });
    expect(submitted?.publication.status).toBe("pending_approval");

    const approved = await approveRoster.execute({
      branchId: "branch-1",
      departmentId: "dep-1",
      from: "2026-04-14",
      to: "2026-04-15",
      approvedByUserId: "user-2",
    });
    expect(approved?.publication.status).toBe("approved");

    const published = await publishRoster.execute({
      branchId: "branch-1",
      departmentId: "dep-1",
      from: "2026-04-14",
      to: "2026-04-15",
      publishedByUserId: "user-3",
    });
    expect(published!.publication.status).toBe("published_locked");
    expect(published!.publication.publishedAt).toBeTruthy();
    expect(published!.publication.lockedAt).toBeTruthy();

    const roster = await queryRoster.execute({
      branchId: "branch-1",
      departmentId: "dep-1",
      from: "2026-04-14",
      to: "2026-04-15",
    });

    expect(roster.publication.isPublished).toBe(true);
    expect(roster.publication.status).toBe("published_locked");
    expect(roster.rows.length).toBeGreaterThan(0);
    expect(roster.rows.every((row: any) => row.departmentId === "dep-1")).toBe(
      true,
    );

    await expect(
      createAssignment.execute({
        employeeId: "empB",
        shiftTemplateId: template.id,
        positionId: "pos-1",
        effectiveFrom: "2026-04-15",
        effectiveTo: "2026-04-16",
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    try {
      await createAssignment.execute({
        employeeId: "empB",
        shiftTemplateId: template.id,
        positionId: "pos-1",
        effectiveFrom: "2026-04-15",
        effectiveTo: "2026-04-16",
      });
    } catch (error: any) {
      expect(error.getResponse().error).toBe(ERROR_CODES.SCHEDULE_LOCKED);
    }
  });

  it("allows rejected roster to become editable again after resubmission", async () => {
    await submitRoster.execute({
      branchId: "branch-1",
      departmentId: "dep-1",
      from: "2026-05-01",
      to: "2026-05-07",
      submittedByUserId: "user-1",
    });

    const rejected = await rejectRoster.execute({
      branchId: "branch-1",
      departmentId: "dep-1",
      from: "2026-05-01",
      to: "2026-05-07",
      rejectedByUserId: "user-2",
      reason: "Coverage missing",
    });

    expect(rejected?.publication.status).toBe("rejected");
    expect(rejected?.publication.rejectionReason).toBe("Coverage missing");

    const resubmitted = await submitRoster.execute({
      branchId: "branch-1",
      departmentId: "dep-1",
      from: "2026-05-01",
      to: "2026-05-07",
      submittedByUserId: "user-1",
    });

    expect(resubmitted?.publication.status).toBe("pending_approval");
  });
});
