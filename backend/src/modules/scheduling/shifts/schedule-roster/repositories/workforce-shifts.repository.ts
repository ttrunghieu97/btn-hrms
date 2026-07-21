import {  Inject , Injectable } from "@nestjs/common";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  ne,
  or,
  sql,
  type SQL
} from 'drizzle-orm';
import { type DataScope } from '../../../../../core/security/types/data-scope.interface';
import { DATABASE_CONNECTION } from "../../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../../infrastructure/database/database-client.type";
import * as schema from '../../../../../infrastructure/database/schema';
import { type EmployeeShiftAssignmentQueryDto } from '../../dto/employee-shift-assignment-query.dto';
import { type ShiftRosterQueryDto } from '../../dto/shift-roster-query.dto';
import { type WorkforceShiftTemplateQueryDto } from '../../dto/workforce-shift-template-query.dto';
import {
  type IWorkforceShiftsRepository,
  type RosterLifecycleHistoryCreateValues,
  type RosterLifecycleHistoryRecord,
  type RosterPeriodScope,
  type RosterPublicationCreateValues,
  type RosterPublicationRecord,
  type RosterPublicationUpdateValues,
  type ShiftAssignmentConflictRecord,
  type ShiftAssignmentCreateValues,
  type ShiftAssignmentRecord,
  type ShiftAssignmentUpdateValues,
  type ShiftTemplateCreateValues,
  type ShiftTemplateRecord,
  type ShiftTemplateUpdateValues,
  type RosterVersionSnapshotCreateValues,
  type RosterVersionSnapshotRecord
} from './workforce-shifts.repository.contract';

@Injectable()
export class WorkforceShiftsRepository implements IWorkforceShiftsRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  async findShiftTemplateById(id: string): Promise<ShiftTemplateRecord | null> {
    const row = await this.db.query.shiftTemplates.findFirst({
      where: eq(schema.shiftTemplates.id, id)
    });

    return row ?? null;
  }

  async listShiftTemplates(query: WorkforceShiftTemplateQueryDto) {
    const { page = 1, limit = 20, search, status } = query;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    if (status === 'archived') {
      conditions.push(eq(schema.shiftTemplates.isActive, false));
    } else if (status === 'published') {
      conditions.push(eq(schema.shiftTemplates.isActive, true));
    }

    if (search) {
      conditions.push(
        or(
          ilike(schema.shiftTemplates.name, `%${search}%`),
          ilike(schema.shiftTemplates.code, `%${search}%`)
        ) as SQL
      );
    }

    const where = this.combineConditions(conditions);

    const rows = await this.db.query.shiftTemplates.findMany({
      where,
      orderBy: [desc(schema.shiftTemplates.createdAt)],
      limit,
      offset
    });

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.shiftTemplates)
      .where(where);

    return {
      rows,
      total: Number(totalResult?.value ?? 0),
      page,
      limit
    };
  }

  async createShiftTemplate(
    values: ShiftTemplateCreateValues
  ): Promise<ShiftTemplateRecord | null> {
    const [row] = await this.db.insert(schema.shiftTemplates).values(values).returning();
    return row ?? null;
  }

  async updateShiftTemplate(
    id: string,
    values: ShiftTemplateUpdateValues
  ): Promise<ShiftTemplateRecord | null> {
    const [row] = await this.db
      .update(schema.shiftTemplates)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.shiftTemplates.id, id))
      .returning();

    return row ?? null;
  }

  async findShiftAssignmentById(
    id: string,
    scope?: DataScope
  ): Promise<ShiftAssignmentRecord | null> {
    const row = await this.db.query.employeeShiftAssignments.findFirst({
      where: this.combineConditions([
        eq(schema.employeeShiftAssignments.id, id),
        this.assignmentScope(scope)
      ]),
      with: {
        employee: true,
        shiftTemplate: true
      }
    });

    return (row as ShiftAssignmentRecord | undefined) ?? null;
  }

  async listShiftAssignments(
    query: EmployeeShiftAssignmentQueryDto,
    scope?: DataScope
  ) {
    const { page = 1, limit = 20, employeeId, from, to } = query;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    if (employeeId) {
      conditions.push(eq(schema.employeeShiftAssignments.employeeId, employeeId));
    }

    if (from) {
      conditions.push(
        or(
          isNull(schema.employeeShiftAssignments.effectiveTo),
          gte(schema.employeeShiftAssignments.effectiveTo, from)
        ) as SQL
      );
    }

    if (to) {
      conditions.push(lte(schema.employeeShiftAssignments.effectiveFrom, to));
    }

    const scopeCondition = this.assignmentScope(scope);
    if (scopeCondition) {
      conditions.push(scopeCondition);
    }

    const where = this.combineConditions(conditions);

    const rows = await this.db.query.employeeShiftAssignments.findMany({
      where,
      with: {
        employee: true,
        shiftTemplate: true
      },
      orderBy: [desc(schema.employeeShiftAssignments.effectiveFrom)],
      limit,
      offset
    });

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.employeeShiftAssignments)
      .where(where);

    return {
      rows: rows as ShiftAssignmentRecord[],
      total: Number(totalResult?.value ?? 0),
      page,
      limit
    };
  }

  async listEmployeeAssignmentsForConflict(
    employeeId: string,
    excludeId?: string,
    scope?: DataScope
  ): Promise<ShiftAssignmentConflictRecord[]> {
    const conditions: SQL[] = [
      eq(schema.employeeShiftAssignments.employeeId, employeeId),
      ne(schema.employeeShiftAssignments.status, 'cancelled')
    ];

    if (excludeId) {
      conditions.push(ne(schema.employeeShiftAssignments.id, excludeId));
    }

    const scopeCondition = this.assignmentScope(scope);
    if (scopeCondition) {
      conditions.push(scopeCondition);
    }

    return this.db.query.employeeShiftAssignments.findMany({
      where: this.combineConditions(conditions),
      columns: {
        effectiveFrom: true,
        effectiveTo: true
      }
    });
  }

  async createShiftAssignment(
    values: ShiftAssignmentCreateValues
  ): Promise<ShiftAssignmentRecord | null> {
    const [row] = await this.db
      .insert(schema.employeeShiftAssignments)
      .values(values)
      .returning();

    return (row) ?? null;
  }

  async updateShiftAssignment(
    id: string,
    values: ShiftAssignmentUpdateValues,
    expectedVersion?: number,
    tx: any = this.db
  ): Promise<ShiftAssignmentRecord | null> {
    const conditions = [eq(schema.employeeShiftAssignments.id, id)];
    if (expectedVersion !== undefined) {
      conditions.push(eq(schema.employeeShiftAssignments.version, expectedVersion));
    }
    const [row] = await tx
      .update(schema.employeeShiftAssignments)
      .set({
        ...values,
        version: sql`${schema.employeeShiftAssignments.version} + 1`,
        updatedAt: new Date()
      })
      .where(and(...conditions))
      .returning();

    return (row) ?? null;
  }

  async getEmployeeAssignmentsForRange(
    employeeId: string,
    from: string,
    to: string
  ): Promise<ShiftAssignmentRecord[]> {
    return this.db.query.employeeShiftAssignments.findMany({
      where: and(
        eq(schema.employeeShiftAssignments.employeeId, employeeId),
        lte(schema.employeeShiftAssignments.effectiveFrom, to),
        or(
          gte(schema.employeeShiftAssignments.effectiveTo, from),
          isNull(schema.employeeShiftAssignments.effectiveTo)
        ),
      ),
      with: {
        shiftTemplate: true,
      },
    }) as Promise<ShiftAssignmentRecord[]>;
  }

  async getEmployeeActiveAssignmentsByDateRange(
    employeeId: string,
    from: string,
    to: string
  ): Promise<ShiftAssignmentRecord[]> {
    return this.db.query.employeeShiftAssignments.findMany({
      where: and(
        eq(schema.employeeShiftAssignments.employeeId, employeeId),
        ne(schema.employeeShiftAssignments.status, 'cancelled'),
        gte(schema.employeeShiftAssignments.assignmentDate, from),
        lte(schema.employeeShiftAssignments.assignmentDate, to)
      ),
      with: {
        shiftTemplate: true,
      },
    }) as Promise<ShiftAssignmentRecord[]>;
  }


  async listRosterRows(
    query: ShiftRosterQueryDto,
    scope?: DataScope
  ): Promise<ShiftAssignmentRecord[]> {
    const conditions: SQL[] = [
      lte(schema.employeeShiftAssignments.effectiveFrom, query.to),
      or(
        gte(schema.employeeShiftAssignments.effectiveTo, query.from),
        isNull(schema.employeeShiftAssignments.effectiveTo)
      ) as SQL,
      ne(schema.employeeShiftAssignments.status, 'cancelled')
    ];

    const scopeCondition = this.assignmentScope(scope);
    if (scopeCondition) {
      conditions.push(scopeCondition);
    }

    if (query.employeeId) {
      conditions.push(eq(schema.employeeShiftAssignments.employeeId, query.employeeId));
    }

    const rows = (await this.db.query.employeeShiftAssignments.findMany({
      where: this.combineConditions(conditions),
      with: {
        employee: true,
        shiftTemplate: true
      },
      orderBy: [desc(schema.employeeShiftAssignments.effectiveFrom)]
    })) as ShiftAssignmentRecord[];

    if (!query.departmentId) {
      return rows;
    }

    return rows.filter((row) => row.employee?.departmentId === query.departmentId);
  }

  async upsertRosterPublication(
    values: RosterPublicationCreateValues | RosterPublicationUpdateValues,
    tx: any = this.db
  ): Promise<RosterPublicationRecord | null> {
    const dbQuery = tx.query as Record<string, any>;
    const pubTable = schema.shiftRosterPublications;

    if (!('shiftRosterPublications' in dbQuery)) {
      return null;
    }

    const existing = await (
      dbQuery.shiftRosterPublications as {
        findFirst: (args: any) => Promise<RosterPublicationRecord | undefined>;
      }
    ).findFirst({
      where: and(
        values.branchId
          ? eq(pubTable.branchId, values.branchId)
          : isNull(pubTable.branchId),
        values.departmentId
          ? eq(pubTable.departmentId, values.departmentId)
          : isNull(pubTable.departmentId),
        eq(pubTable.periodStart, values.periodStart as string),
        eq(pubTable.periodEnd, values.periodEnd as string)
      )
    });

    if (existing) {
      const [updated] = await tx
        .update(pubTable)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(pubTable.id, existing.id))
        .returning();

      return (updated as RosterPublicationRecord | undefined) ?? null;
    }

    const [created] = await tx
      .insert(pubTable)
      .values(values)
      .returning();

    return (created as RosterPublicationRecord | undefined) ?? null;
  }

  async findRosterPublication(
    query: ShiftRosterQueryDto,
    tx: any = this.db
  ): Promise<RosterPublicationRecord | null> {
    const dbQuery = tx.query as Record<string, any>;

    if (!('shiftRosterPublications' in dbQuery)) {
      return null;
    }

    const pubTable = schema.shiftRosterPublications;

    const row = await (
      dbQuery.shiftRosterPublications as {
        findFirst: (args: any) => Promise<RosterPublicationRecord | undefined>;
      }
    ).findFirst({
      where: and(
        query.branchId
          ? eq(pubTable.branchId, query.branchId)
          : isNull(pubTable.branchId),
        query.departmentId
          ? eq(pubTable.departmentId, query.departmentId)
          : isNull(pubTable.departmentId),
        eq(pubTable.periodStart, query.from),
        eq(pubTable.periodEnd, query.to)
      ),
      orderBy: [desc(pubTable.updatedAt)]
    });

    return row ?? null;
  }

  async ensureRosterPublication(scope: RosterPeriodScope, tx: any = this.db): Promise<RosterPublicationRecord> {
    const existing = await this.findRosterPublication({
      branchId: scope.branchId ?? undefined,
      departmentId: scope.departmentId ?? undefined,
      from: scope.from,
      to: scope.to
    }, tx);

    if (existing) {
      return existing;
    }

    return (await this.upsertRosterPublication({
      branchId: scope.branchId ?? null,
      departmentId: scope.departmentId ?? null,
      periodStart: scope.from,
      periodEnd: scope.to,
      status: 'draft',
      version: 1
    }, tx)) as RosterPublicationRecord;
  }

  async createRosterLifecycleHistory(
    values: RosterLifecycleHistoryCreateValues,
    tx: any = this.db
  ): Promise<RosterLifecycleHistoryRecord | null> {
    const [created] = await tx
      .insert(schema.shiftRosterLifecycleHistory)
      .values(values)
      .returning();

    return created ?? null;
  }

  async findBlockingRosterPublication(
    scope: RosterPeriodScope
  ): Promise<RosterPublicationRecord | null> {
    const conditions: SQL[] = [
      scope.branchId
        ? eq(schema.shiftRosterPublications.branchId, scope.branchId)
        : isNull(schema.shiftRosterPublications.branchId),
      lte(schema.shiftRosterPublications.periodStart, scope.to),
      gte(schema.shiftRosterPublications.periodEnd, scope.from),
      or(
        eq(schema.shiftRosterPublications.status, 'pending_approval'),
        eq(schema.shiftRosterPublications.status, 'approved'),
        eq(schema.shiftRosterPublications.status, 'published_locked')
      ) as SQL
    ];

    if (scope.departmentId) {
      conditions.push(eq(schema.shiftRosterPublications.departmentId, scope.departmentId));
    }

    const row = await this.db.query.shiftRosterPublications.findFirst({
      where: and(...conditions),
      orderBy: [desc(schema.shiftRosterPublications.updatedAt)]
    });

    return row ?? null;
  }

  async findLocationById(id: string): Promise<{ id: string; name: string } | null> {
    const row = await this.db.query.locations.findFirst({
      where: eq(schema.locations.id, id),
      columns: { id: true, name: true }
    });
    return row ?? null;
  }

  async createRosterVersionSnapshot(
    values: RosterVersionSnapshotCreateValues,
    tx: any = this.db
  ): Promise<RosterVersionSnapshotRecord | null> {
    const [row] = await tx
      .insert(schema.shiftRosterVersionSnapshots)
      .values(values)
      .returning();

    return row ?? null;
  }

  async findRosterVersionSnapshots(
    rosterPublicationId: string
  ): Promise<RosterVersionSnapshotRecord[]> {
    return this.db.query.shiftRosterVersionSnapshots.findMany({
      where: eq(schema.shiftRosterVersionSnapshots.rosterPublicationId, rosterPublicationId),
      orderBy: [desc(schema.shiftRosterVersionSnapshots.version)]
    });
  }

  async transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }

  private assignmentScope(scope?: DataScope): SQL | undefined {
    if (!scope || scope.tier === 'all') {
      return undefined;
    }

    if (scope.tier === 'self' && scope.employeeId) {
      return eq(schema.employeeShiftAssignments.employeeId, scope.employeeId);
    }

    if (scope.tier === 'department' && scope.departmentId) {
      return sql`exists (
        select 1
        from ${schema.orgAssignments}
        where ${schema.orgAssignments.employeeId} = ${schema.employeeShiftAssignments.employeeId}
          and ${schema.orgAssignments.departmentId} = ${scope.departmentId}
          and ${schema.orgAssignments.isCurrent} = true
      )`;
    }

    return undefined;
  }

  private combineConditions(conditions: (SQL | undefined)[]) {
    const activeConditions = conditions.filter(
      (condition): condition is SQL => Boolean(condition)
    );

    if (activeConditions.length === 0) {
      return undefined;
    }

    if (activeConditions.length === 1) {
      return activeConditions[0];
    }

    return and(...activeConditions);
  }
}




