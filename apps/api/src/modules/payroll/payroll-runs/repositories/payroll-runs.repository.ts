import { Inject, Injectable } from "@nestjs/common";
import { SQL, and, count, desc, eq, gte, inArray, lte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import * as schema from "../../../../infrastructure/database/schema";
import { BaseRepository } from "../../../../infrastructure/repositories/base.repository";
import { PayrollRunQueryDto } from "../dto/payroll-run-query.dto";

type PayrollRunWithPeriod = typeof schema.payrollRuns.$inferSelect & {
  payrollPeriod: typeof schema.payrollPeriods.$inferSelect | null;
};

export type PayrollRunCreateInput = typeof schema.payrollRuns.$inferInsert;
export type PayrollRunUpdateInput = Partial<PayrollRunCreateInput>;
export type PayrollItemCreateInput = typeof schema.payrollItems.$inferInsert;
export type PayrollRunTransaction = PostgresJsDatabase<typeof schema>;

@Injectable()
export class PayrollRunsRepository extends BaseRepository<
  typeof schema.payrollRuns.$inferSelect,
  typeof schema.payrollRuns.$inferInsert,
  Partial<typeof schema.payrollRuns.$inferInsert>,
  string,
  import("../../../../infrastructure/repositories/base.repository").FindOptions<typeof schema.payrollRuns.$inferSelect>,
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

  async getAttendanceSummariesByEmployee(
    employeeIds: string[],
    startsOn: string,
    endsOn: string,
  ) {
    if (!employeeIds.length) return new Map<string, typeof schema.attendanceDailySummaries.$inferSelect[]>();

    const attendanceRows = await this.db.query.attendanceDailySummaries.findMany({
      where: and(
        inArray(schema.attendanceDailySummaries.employeeId, employeeIds),
        gte(schema.attendanceDailySummaries.workDate, startsOn),
        lte(schema.attendanceDailySummaries.workDate, endsOn),
      ),
    });

    const byEmployee = new Map<string, typeof schema.attendanceDailySummaries.$inferSelect[]>();
    for (const row of attendanceRows) {
      const current = byEmployee.get(row.employeeId) ?? [];
      current.push(row);
      byEmployee.set(row.employeeId, current);
    }
    return byEmployee;
  }

  transaction<T>(handler: (tx: PayrollRunTransaction) => Promise<T>) {
    return this.db.transaction(handler);
  }

  markRunProcessing(payrollRunId: string, tx: PostgresJsDatabase<typeof schema>) {
    return tx
      .update(schema.payrollRuns)
      .set({ status: "processing", processedAt: null, updatedAt: new Date() })
      .where(eq(schema.payrollRuns.id, payrollRunId));
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
      .where(eq(schema.payrollRuns.id, payrollRunId));
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

  async update(id: string, data: PayrollRunUpdateInput): Promise<PayrollRunWithPeriod | null> {
    const [row] = await this.db
      .update(schema.payrollRuns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.payrollRuns.id, id))
      .returning();
    return row ? (await this.db.query.payrollRuns.findFirst({
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




