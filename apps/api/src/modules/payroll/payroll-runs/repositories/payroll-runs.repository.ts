import { Inject, Injectable } from "@nestjs/common";
import { SQL, and, asc, count, desc, eq, inArray, lte, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import * as schema from "../../../../infrastructure/database/schema";
import { BaseRepository, type FindOptions } from "../../../../infrastructure/repositories/base.repository";
import { PayrollRunQueryDto } from "../dto/payroll-run-query.dto";

type PayrollRunWithPeriod = typeof schema.payrollRuns.$inferSelect & {
  payrollPeriod: typeof schema.payrollPeriods.$inferSelect | null;
};

export type PayrollRunCreateInput = typeof schema.payrollRuns.$inferInsert;
export type PayrollRunUpdateInput = Partial<PayrollRunCreateInput>;
export type PayrollItemCreateInput = typeof schema.payrollItems.$inferInsert;
export type PayrollRunTransaction = PostgresJsDatabase<typeof schema>;

let lastApprovalHistoryTimestampMs = 0;

/**
 * Produces a strictly monotonic Date (at least +1ms per call) so sequential
 * approval history entries preserve deterministic chronological ordering even
 * when multiple lifecycle transitions execute within the same millisecond or
 * inside a single outer PostgreSQL transaction (where `now()` is constant).
 */
export function nextApprovalHistoryTimestamp(): Date {
  const now = Date.now();
  lastApprovalHistoryTimestampMs =
    now > lastApprovalHistoryTimestampMs ? now : lastApprovalHistoryTimestampMs + 1;
  return new Date(lastApprovalHistoryTimestampMs);
}

@Injectable()
export class PayrollRunsRepository extends BaseRepository<
  typeof schema.payrollRuns.$inferSelect,
  typeof schema.payrollRuns.$inferInsert,
  Partial<typeof schema.payrollRuns.$inferInsert>,
  string,
  FindOptions<typeof schema.payrollRuns.$inferSelect>,
  PayrollRunWithPeriod
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {
    super();
  }

  getPayrollPeriodById(id: string) {
    return this.db.query.payrollPeriods.findFirst({
      where: eq(schema.payrollPeriods.id, id),
    });
  }

  async findByPeriodAndBranch(payrollPeriodId: string, branchId: string | null) {
    return this.db.query.payrollRuns.findFirst({
      where: and(
        eq(schema.payrollRuns.payrollPeriodId, payrollPeriodId),
        branchId
          ? eq(schema.payrollRuns.branchId, branchId)
          : sql`${schema.payrollRuns.branchId} is null`,
      ),
    });
  }

  getEmployeesForPayrollRun(input: { branchId?: string | null }) {
    return this.db.query.employees.findMany({
      where: input.branchId
        ? eq(schema.employees.branchId, input.branchId)
        : undefined,
      with: {
        department: true,
      },
    });
  }

  async getSalaryByEmployeeForPeriod(
    employeeIds: string[],
    startsOn?: string,
    endsOn?: string,
  ) {
    if (!employeeIds.length) return new Map<string, typeof schema.salaryStructures.$inferSelect>();

    if (startsOn && endsOn) {
      const effectiveStructures = await this.db.query.salaryStructures.findMany({
        where: and(
          inArray(schema.salaryStructures.employeeId, employeeIds),
          lte(schema.salaryStructures.effectiveFrom, endsOn),
          sql`(${schema.salaryStructures.effectiveTo} is null or ${schema.salaryStructures.effectiveTo} >= ${startsOn})`,
        ),
        orderBy: [desc(schema.salaryStructures.effectiveFrom)],
      });

      if (effectiveStructures.length > 0) {
        const map = new Map<string, typeof schema.salaryStructures.$inferSelect>();
        for (const s of effectiveStructures) {
          if (!map.has(s.employeeId)) {
            map.set(s.employeeId, s);
          }
        }
        if (employeeIds.every((id) => map.has(id))) {
          return map;
        }
        const missingIds = employeeIds.filter((id) => !map.has(id));
        const currentStructures = await this.db.query.salaryStructures.findMany({
          where: and(
            inArray(schema.salaryStructures.employeeId, missingIds),
            eq(schema.salaryStructures.isCurrent, true),
          ),
        });
        for (const s of currentStructures) {
          map.set(s.employeeId, s);
        }
        return map;
      }
    }

    return this.getCurrentSalaryByEmployee(employeeIds);
  }

  async getCurrentSalaryByEmployee(employeeIds: string[]) {
    if (!employeeIds.length) return new Map<string, typeof schema.salaryStructures.$inferSelect>();
    const salaryStructures = await this.db.query.salaryStructures.findMany({
      where: and(
        inArray(schema.salaryStructures.employeeId, employeeIds),
        eq(schema.salaryStructures.isCurrent, true),
      ),
    });

    return new Map<string, typeof schema.salaryStructures.$inferSelect>(
      salaryStructures.map((salary) => [salary.employeeId, salary]),
    );
  }

  transaction<T>(handler: (tx: PayrollRunTransaction) => Promise<T>) {
    return this.db.transaction(handler);
  }

  markRunProcessing(
    payrollRunId: string,
    tx: PostgresJsDatabase<typeof schema>,
    expectedStatus: string = "draft",
  ) {
    if (expectedStatus !== "draft") {
      return Promise.resolve([] as (typeof schema.payrollRuns.$inferSelect)[]);
    }

    return tx
      .update(schema.payrollRuns)
      .set({ status: "processing", processedAt: null, updatedAt: new Date() })
      .where(
        and(
          eq(schema.payrollRuns.id, payrollRunId),
          eq(schema.payrollRuns.status, "draft"),
        ),
      )
      .returning();
  }

  async lockRunById(id: string, tx: PayrollRunTransaction) {
    const rows = await tx.execute<{
      id: string;
      status: string;
      approved_by_user_id: string | null;
      posted_by_user_id: string | null;
      calculation_version_id: string | null;
      calculation_hash: string | null;
    }>(sql`
      SELECT
        id,
        status,
        approved_by_user_id,
        posted_by_user_id,
        calculation_version_id,
        calculation_hash
      FROM payroll_runs
      WHERE id = ${id}
      FOR UPDATE
    `);
    const row = Array.isArray(rows) ? rows[0] : (rows as any)?.rows?.[0];
    if (!row) return null;
    return {
      id: row.id,
      status: row.status as typeof schema.payrollRuns.$inferSelect["status"],
      approvedByUserId: row.approved_by_user_id ?? null,
      postedByUserId: row.posted_by_user_id ?? null,
      calculationVersionId: row.calculation_version_id ?? null,
      calculationHash: row.calculation_hash ?? null,
    };
  }

  async updateStatusWithGuard(
    id: string,
    expectedStatus: typeof schema.payrollRuns.$inferSelect["status"],
    data: PayrollRunUpdateInput,
    tx?: PostgresJsDatabase<typeof schema>,
  ) {
    const db = tx ?? this.db;
    const [row] = await db
      .update(schema.payrollRuns)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(schema.payrollRuns.id, id),
          eq(schema.payrollRuns.status, expectedStatus),
        ),
      )
      .returning();
    return row ?? null;
  }

  deleteRunItems(payrollRunId: string, tx: PostgresJsDatabase<typeof schema>) {
    return tx
      .delete(schema.payrollItems)
      .where(eq(schema.payrollItems.payrollRunId, payrollRunId));
  }

  deleteRunPayslips(payrollRunId: string, tx: PostgresJsDatabase<typeof schema>) {
    return tx
      .delete(schema.payslips)
      .where(eq(schema.payslips.payrollRunId, payrollRunId));
  }

  async getRunInputSnapshotsWithItems(
    payrollRunId: string,
    tx?: PayrollRunTransaction,
  ) {
    const db = tx ?? this.db;
    const snapshots = await db
      .select()
      .from(schema.payrollInputSnapshots)
      .where(eq(schema.payrollInputSnapshots.payrollRunId, payrollRunId))
      .orderBy(
        asc(schema.payrollInputSnapshots.createdAt),
        asc(schema.payrollInputSnapshots.id),
      );
    if (!snapshots.length) return [];
    const snapshotIds = snapshots.map((s) => s.id);
    const items = await db
      .select()
      .from(schema.payrollInputSnapshotItems)
      .where(inArray(schema.payrollInputSnapshotItems.snapshotId, snapshotIds));
    const itemsBySnapshotId = new Map<
      string,
      (typeof schema.payrollInputSnapshotItems.$inferSelect)[]
    >();
    for (const item of items) {
      const list = itemsBySnapshotId.get(item.snapshotId) ?? [];
      list.push(item);
      itemsBySnapshotId.set(item.snapshotId, list);
    }
    return snapshots.map((snapshot) => ({
      snapshot,
      items: itemsBySnapshotId.get(snapshot.id) ?? [],
    }));
  }

  deleteRunInputSnapshots(
    payrollRunId: string,
    tx: PayrollRunTransaction,
  ) {
    return tx
      .delete(schema.payrollInputSnapshots)
      .where(
        and(
          eq(schema.payrollInputSnapshots.payrollRunId, payrollRunId),
          sql`${schema.payrollInputSnapshots.status} <> 'locked'`,
          sql`${schema.payrollInputSnapshots.lockedAt} is null`,
        ),
      );
  }

  lockRunInputSnapshots(
    payrollRunId: string,
    tx: PayrollRunTransaction,
  ) {
    return tx
      .update(schema.payrollInputSnapshots)
      .set({
        status: "locked",
        lockedAt: new Date(),
      })
      .where(eq(schema.payrollInputSnapshots.payrollRunId, payrollRunId));
  }

  async findPayslipsByRunId(payrollRunId: string, tx?: PayrollRunTransaction) {
    const db = tx ?? this.db;
    return db.query.payslips.findMany({
      where: eq(schema.payslips.payrollRunId, payrollRunId),
    });
  }

  async createPayslips(
    inputs: {
      payrollRunId: string;
      employeeId: string;
      grossPay: number;
      totalDeductions: number;
      netPay: number;
      currency: string;
      status: string;
      metadata: unknown | null;
    }[],
    tx: PostgresJsDatabase<typeof schema>,
  ) {
    if (!inputs.length) return [] as { id: string; employeeId: string }[];
    const result = await tx
      .insert(schema.payslips)
      .values(
        inputs.map((input) => ({
          payrollRunId: input.payrollRunId,
          employeeId: input.employeeId,
          grossPay: String(input.grossPay),
          totalDeductions: String(input.totalDeductions),
          netPay: String(input.netPay),
          currency: input.currency,
          status: input.status as "draft" | "published" | "acknowledged" | "voided",
          metadata: input.metadata,
        })),
      )
      .returning({ id: schema.payslips.id, employeeId: schema.payslips.employeeId });
    return result;
  }

  createPayrollItems(items: PayrollItemCreateInput[], tx: PayrollRunTransaction) {
    if (!items.length) return Promise.resolve();
    return tx.insert(schema.payrollItems).values(items);
  }

  async insertInputSnapshot(
    snapshot: typeof schema.payrollInputSnapshots.$inferInsert,
    itemInputs: Omit<typeof schema.payrollInputSnapshotItems.$inferInsert, "snapshotId">[],
    tx: PayrollRunTransaction,
  ) {
    const [created] = await tx.insert(schema.payrollInputSnapshots).values(snapshot).returning();
    if (!created) return null;
    if (itemInputs.length > 0) {
      const items = itemInputs.map((item) => ({ ...item, snapshotId: created.id }));
      await tx.insert(schema.payrollInputSnapshotItems).values(items as any);
    }
    return created;
  }

  async insertInputSnapshotsBatch(
    entries: {
      snapshot: typeof schema.payrollInputSnapshots.$inferInsert;
      itemInputs: Omit<typeof schema.payrollInputSnapshotItems.$inferInsert, "snapshotId">[];
    }[],
    tx: PayrollRunTransaction,
  ) {
    if (!entries.length) return [];
    const snapshotsToInsert = entries.map((e) => e.snapshot);
    const createdSnapshots = await tx
      .insert(schema.payrollInputSnapshots)
      .values(snapshotsToInsert)
      .returning();

    const snapshotMap = new Map<string, string>();
    for (const snap of createdSnapshots) {
      snapshotMap.set(snap.employeeId, snap.id);
    }

    const allItems: (typeof schema.payrollInputSnapshotItems.$inferInsert)[] = [];
    for (const entry of entries) {
      const snapshotId = snapshotMap.get(entry.snapshot.employeeId);
      if (!snapshotId) continue;
      for (const item of entry.itemInputs) {
        allItems.push({ ...item, snapshotId } as any);
      }
    }

    if (allItems.length > 0) {
      await tx.insert(schema.payrollInputSnapshotItems).values(allItems as any);
    }

    return createdSnapshots;
  }

  markRunApproved(payrollRunId: string, tx: PostgresJsDatabase<typeof schema>) {
    return tx
      .update(schema.payrollRuns)
      .set({
        status: "approved",
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.payrollRuns.id, payrollRunId));
  }

  markRunPendingApproval(payrollRunId: string, tx: PostgresJsDatabase<typeof schema>) {
    return tx
      .update(schema.payrollRuns)
      .set({
        status: "pending_approval",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.payrollRuns.id, payrollRunId),
          eq(schema.payrollRuns.status, "processing"),
        ),
      )
      .returning();
  }

  async recordApprovalAction(
    payrollRunId: string,
    action: string,
    performedByUserId: string | null,
    comment: string | null,
    tx: PayrollRunTransaction,
  ) {
    await tx.insert(schema.payrollRunApprovalHistory).values({
      payrollRunId,
      action,
      performedByUserId,
      comment,
      createdAt: nextApprovalHistoryTimestamp(),
    });
  }

  async getApprovalHistory(payrollRunId: string, tx?: PayrollRunTransaction) {
    const db = tx ?? this.db;
    return db
      .select()
      .from(schema.payrollRunApprovalHistory)
      .where(eq(schema.payrollRunApprovalHistory.payrollRunId, payrollRunId))
      .orderBy(
        asc(schema.payrollRunApprovalHistory.createdAt),
        asc(schema.payrollRunApprovalHistory.id),
      );
  }

  async findActiveCalculationVersion() {
    const row = await this.db.query.payrollCalculationVersions.findFirst({
      where: eq(schema.payrollCalculationVersions.status, "active"),
      orderBy: [desc(schema.payrollCalculationVersions.createdAt)],
    });
    return row ?? null;
  }

  async findById(id: string): Promise<PayrollRunWithPeriod | null> {
    const row = await this.db.query.payrollRuns.findFirst({
      where: eq(schema.payrollRuns.id, id),
      with: { payrollPeriod: true },
    });
    return row ?? null;
  }

  async findMany(query?: PayrollRunQueryDto): Promise<PayrollRunWithPeriod[]> {
    return this.list(query ?? new PayrollRunQueryDto()).then((r) => r.rows);
  }

  async create(data: PayrollRunCreateInput): Promise<PayrollRunWithPeriod | null> {
    const [row] = await this.db.insert(schema.payrollRuns).values(data).returning();
    return row ? (await this.db.query.payrollRuns.findFirst({
      where: eq(schema.payrollRuns.id, row.id),
      with: { payrollPeriod: true },
    })) ?? null : null;
  }

  async update(
    id: string,
    data: PayrollRunUpdateInput,
    tx?: PostgresJsDatabase<typeof schema>,
  ): Promise<PayrollRunWithPeriod | null> {
    const db = tx ?? this.db;
    const [row] = await db
      .update(schema.payrollRuns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.payrollRuns.id, id))
      .returning();
    return row ? (await db.query.payrollRuns.findFirst({
      where: eq(schema.payrollRuns.id, row.id),
      with: { payrollPeriod: true },
    })) ?? null : null;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(schema.payrollRuns).where(eq(schema.payrollRuns.id, id));
  }

  async list(query: PayrollRunQueryDto = new PayrollRunQueryDto()) {
    const { page = 1, limit = 20, payrollPeriodId, status } = query;
    const offset = (page - 1) * limit;
    const conditions: SQL[] = [];
    if (payrollPeriodId)
      conditions.push(eq(schema.payrollRuns.payrollPeriodId, payrollPeriodId));
    if (status) conditions.push(eq(schema.payrollRuns.status, status as typeof schema.payrollRuns.$inferSelect['status']));
    const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);
    const rows = await this.db.query.payrollRuns.findMany({
      where,
      with: { payrollPeriod: true },
      orderBy: [desc(schema.payrollRuns.createdAt)],
      limit,
      offset,
    });
    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.payrollRuns)
      .where(where);
    return { rows, total: Number(totalResult?.value ?? 0), page, limit };
  }
}




