import { Inject, Injectable } from "@nestjs/common";
import { SQL, and, count, desc, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import * as schema from "../../../../infrastructure/database/schema";
import { BaseRepository } from "../../../../infrastructure/repositories/base.repository";
import { PayrollQueryDto } from "../dto/payroll-query.dto";

type LegacyPayrollRow = {
  id: string;
  employeeId: string;
  salary: string;
  bonus?: string;
  deduction?: string;
  allowance?: string;
  overtimeAmount?: string;
  taxAmount?: string;
  insuranceAmount?: string;
  netSalary?: string;
  currency: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  employee?: typeof schema.employees.$inferSelect & {
    orgAssignments?: { isCurrent: boolean; jobTitle: string | null }[];
    department?: { name: string | null } | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  payslipId: string;
  payrollRunId: string;
};

@Injectable()
export class PayrollRepository extends BaseRepository<
  LegacyPayrollRow,
  Record<string, never>,
  Record<string, never>
> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {
    super();
  }

  async transaction<T>(fn: (tx: PostgresJsDatabase<typeof schema>) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }

  async findById(id: string) {
    const payslip = await this.db.query.payslips.findFirst({
      where: eq(schema.payslips.id, id),
      with: this.withRelations(),
    });
    return payslip ? this.toLegacyPayroll(payslip) : null;
  }

  /**
   * Current salary structure for one employee (source of truth for base pay).
   * Used by final-settlement compute; salary_structures is owned by the payroll
   * context, so this read stays inside the boundary.
   */
  async getCurrentSalaryStructureByEmployeeId(employeeId: string) {
    const row = await this.db.query.salaryStructures.findFirst({
      where: and(
        eq(schema.salaryStructures.employeeId, employeeId),
        eq(schema.salaryStructures.isCurrent, true),
      ),
    });
    return row ?? null;
  }

  async findMany(query?: PayrollQueryDto) {
    const { rows } = await this.list(query ?? new PayrollQueryDto());
    return rows;
  }

  async findByEmployeeId(employeeId: string, tx: PostgresJsDatabase<typeof schema> = this.db) {
    const rows = await tx.query.payslips.findMany({
      where: eq(schema.payslips.employeeId, employeeId),
      with: this.withRelations(),
      orderBy: [desc(schema.payslips.updatedAt)],
      limit: 1,
    });
    return rows[0] ? this.toLegacyPayroll(rows[0]) : null;
  }

  async create(): Promise<LegacyPayrollRow | null> {
    throw new Error("Use upsertByEmployeeId() for payroll writes");
  }

  async update(_id: string, _data: Record<string, never>): Promise<LegacyPayrollRow | null> {
    throw new Error("Use upsertByEmployeeId() for payroll writes");
  }

  async delete() {
    throw new Error("Legacy payroll delete is no longer supported");
  }

  async list(query: PayrollQueryDto) {
    const { page = 1, limit = 20, search } = query;
    const offset = (page - 1) * limit;
    const conditions: SQL[] = [];

    if (search) {
      const matchingEmployees = await this.db
        .select({ id: schema.employees.id })
        .from(schema.employees)
        .where(
          or(
            ilike(schema.employees.firstName, `%${search}%`),
            ilike(schema.employees.lastName, `%${search}%`),
            ilike(schema.employees.employeeCode, `%${search}%`),
          ),
        );

      const ids = matchingEmployees.map((row) => row.id);
      if (ids.length === 0) {
        return { rows: [], total: 0, page, limit };
      }
      conditions.push(inArray(schema.payslips.employeeId, ids));
    }

    const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    const payslips = await this.db.query.payslips.findMany({
      where,
      with: this.withRelations(),
      orderBy: [desc(schema.payslips.updatedAt)],
      limit,
      offset,
    });

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.payslips)
      .where(where);

    return {
      rows: payslips.map((row) => this.toLegacyPayroll(row)),
      total: Number(totalResult?.count ?? 0),
      page,
      limit,
    };
  }

  async upsertByEmployeeId(
    employeeId: string,
    values: {
      salary?: string;
      bonus?: string;
      deduction?: string;
      allowance?: string;
      overtimeAmount?: string;
      taxAmount?: string;
      insuranceAmount?: string;
      netSalary?: string;
      currency?: string;
      effectiveFrom?: string | null;
      effectiveTo?: string | null;
    },
    tx: PostgresJsDatabase<typeof schema> = this.db,
  ) {
    const employee = await tx.query.employees.findFirst({
      where: eq(schema.employees.id, employeeId),
    });
    if (!employee) {
      throw new Error(`Employee ${employeeId} not found`);
    }

    const periodBounds = this.resolvePeriodBounds(
      values.effectiveFrom,
      values.effectiveTo,
    );
    const payrollPeriod = await this.ensurePayrollPeriod(periodBounds, tx);
    const payrollRun = await this.ensurePayrollRun(
      payrollPeriod.id,
      employee.branchId ?? null,
      tx,
    );

    const existing = await tx.query.payslips.findFirst({
      where: and(
        eq(schema.payslips.employeeId, employeeId),
        eq(schema.payslips.payrollRunId, payrollRun.id),
      ),
      with: { payrollItems: true },
    });

    const salary = values.salary ?? "0";
    const bonus = values.bonus ?? "0";
    const deduction = values.deduction ?? "0";
    const allowance = values.allowance ?? "0";
    const overtimeAmount = values.overtimeAmount ?? "0";
    const taxAmount = values.taxAmount ?? "0";
    const insuranceAmount = values.insuranceAmount ?? "0";
    const grossPay = this.sum([salary, bonus, allowance, overtimeAmount]);
    const totalDeductions = this.sum([deduction, taxAmount, insuranceAmount]);
    const netPay = values.netSalary ?? this.subtract(grossPay, totalDeductions);
    const currency = values.currency ?? "VND";

    let payslipId = existing?.id;
    if (existing) {
      await tx
        .update(schema.payslips)
        .set({
          grossPay,
          totalDeductions,
          netPay,
          currency,
          metadata: {
            source: "legacy-payroll-upsert",
            effectiveFrom: values.effectiveFrom ?? null,
            effectiveTo: values.effectiveTo ?? null,
          },
          updatedAt: new Date(),
        })
        .where(eq(schema.payslips.id, existing.id));

      await tx
        .delete(schema.payrollItems)
        .where(eq(schema.payrollItems.payslipId, existing.id));
    } else {
      const [inserted] = await tx
        .insert(schema.payslips)
        .values({
          payrollRunId: payrollRun.id,
          employeeId,
          grossPay,
          totalDeductions,
          netPay,
          currency,
          status: "draft",
          metadata: {
            source: "legacy-payroll-upsert",
            effectiveFrom: values.effectiveFrom ?? null,
            effectiveTo: values.effectiveTo ?? null,
          },
        })
        .returning();
      payslipId = inserted?.id;
    }

    if (!payslipId) {
      throw new Error(`Failed to upsert payslip for employee ${employeeId}`);
    }

    await tx.insert(schema.payrollItems).values(
      [
        this.makePayrollItem(payrollRun.id, payslipId, employeeId, {
          type: "earning",
          code: "base_salary",
          name: "Base Salary",
          amount: salary,
        }),
        this.makePayrollItem(payrollRun.id, payslipId, employeeId, {
          type: "earning",
          code: "bonus",
          name: "Bonus",
          amount: bonus,
        }),
        this.makePayrollItem(payrollRun.id, payslipId, employeeId, {
          type: "earning",
          code: "allowance",
          name: "Allowance",
          amount: allowance,
        }),
        this.makePayrollItem(payrollRun.id, payslipId, employeeId, {
          type: "overtime",
          code: "overtime",
          name: "Overtime",
          amount: overtimeAmount,
        }),
        this.makePayrollItem(payrollRun.id, payslipId, employeeId, {
          type: "deduction",
          code: "deduction",
          name: "Deduction",
          amount: deduction,
        }),
        this.makePayrollItem(payrollRun.id, payslipId, employeeId, {
          type: "tax",
          code: "tax",
          name: "Tax",
          amount: taxAmount,
        }),
        this.makePayrollItem(payrollRun.id, payslipId, employeeId, {
          type: "insurance",
          code: "insurance",
          name: "Insurance",
          amount: insuranceAmount,
        }),
      ]      .filter((item) => item.amount !== "0"),
    );

    const reloaded = await tx.query.payslips.findFirst({
      where: eq(schema.payslips.id, payslipId),
      with: this.withRelations(),
    });
    const row = reloaded ? this.toLegacyPayroll(reloaded) : null;
    if (!row) {
      throw new Error(`Failed to reload payslip ${payslipId}`);
    }
    return row;
  }

  private withRelations() {
    return {
      employee: { with: { department: true, orgAssignments: true } },
      payrollItems: true,
      payrollRun: { with: { payrollPeriod: true } },
    } as const;
  }

  private toLegacyPayroll(row: typeof schema.payslips.$inferSelect & {
    payrollItems?: typeof schema.payrollItems.$inferSelect[];
    payrollRun?: { payrollPeriod: { startsOn: string; endsOn: string } | null } | null;
    employee?: typeof schema.employees.$inferSelect & {
      orgAssignments?: { isCurrent: boolean; jobTitle: string | null }[];
      department?: { name: string | null } | null;
    } | null;
  }): LegacyPayrollRow {
    const itemAmount = (code: string, fallback = "0") =>
      String(
        row.payrollItems?.find((item) => item.code === code)?.amount ??
          fallback,
      );

    const salary = itemAmount("base_salary", row.grossPay);
    const bonus = itemAmount("bonus");
    const allowance = itemAmount("allowance");
    const overtimeAmount = itemAmount("overtime");
    const deduction = itemAmount("deduction");
    const taxAmount = itemAmount("tax");
    const insuranceAmount = itemAmount("insurance");

    return {
      id: row.id,
      payslipId: row.id,
      payrollRunId: row.payrollRunId,
      employeeId: row.employeeId,
      salary,
      bonus,
      deduction,
      allowance,
      overtimeAmount,
      taxAmount,
      insuranceAmount,
      netSalary: String(row.netPay ?? "0"),
      currency: row.currency ?? "VND",
      effectiveFrom: row.payrollRun?.payrollPeriod?.startsOn ?? null,
      effectiveTo: row.payrollRun?.payrollPeriod?.endsOn ?? null,
      employee: row.employee,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private resolvePeriodBounds(
    effectiveFrom?: string | null,
    effectiveTo?: string | null,
  ) {
    const from = effectiveFrom
      ? new Date(`${effectiveFrom}T00:00:00.000Z`)
      : new Date();
    const year = from.getUTCFullYear();
    const month = from.getUTCMonth();
    const startsOn = new Date(Date.UTC(year, month, 1))
      .toISOString()
      .slice(0, 10);
    const endsOn =
      effectiveTo ??
      new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
    return {
      code: `manual-${startsOn.slice(0, 7)}`,
      name: `Manual Payroll ${startsOn.slice(0, 7)}`,
      startsOn,
      endsOn,
    };
  }

  private async ensurePayrollPeriod(
    period: { code: string; name: string; startsOn: string; endsOn: string },
    tx: PostgresJsDatabase<typeof schema> = this.db,
  ) {
    const existing = await tx.query.payrollPeriods.findFirst({
      where: eq(schema.payrollPeriods.code, period.code),
    });
    if (existing) return existing;

    const [created] = await tx
      .insert(schema.payrollPeriods)
      .values({
        code: period.code,
        name: period.name,
        startsOn: period.startsOn,
        endsOn: period.endsOn,
        status: "open",
      })
      .returning();
    return created!;
  }

  private async ensurePayrollRun(
    payrollPeriodId: string,
    branchId: string | null,
    tx: PostgresJsDatabase<typeof schema> = this.db,
  ) {
    const existing = await tx.query.payrollRuns.findFirst({
      where: and(
        eq(schema.payrollRuns.payrollPeriodId, payrollPeriodId),
        branchId === null
          ? isNull(schema.payrollRuns.branchId)
          : eq(schema.payrollRuns.branchId, branchId),
      ),
    });
    if (existing) return existing;

    const [created] = await tx
      .insert(schema.payrollRuns)
      .values({
        payrollPeriodId,
        branchId,
        status: "draft",
      })
      .returning();
    return created!;
  }

  private makePayrollItem(
    payrollRunId: string,
    payslipId: string,
    employeeId: string,
    input: { type: "earning" | "deduction" | "tax" | "insurance" | "overtime" | "adjustment" | "employer_contribution"; code: string; name: string; amount: string },
  ): typeof schema.payrollItems.$inferInsert {
    return {
      payrollRunId,
      payslipId,
      employeeId,
      type: input.type,
      code: input.code,
      name: input.name,
      amount: input.amount,
      quantity: "1",
      rate: input.amount,
      metadata: { source: "legacy-payroll-upsert" },
    };
  }

  private sum(values: string[]) {
    return String(
      values.reduce((total, value) => total + Number(value ?? 0), 0).toFixed(2),
    );
  }

  private subtract(a: string, b: string) {
    return String((Number(a) - Number(b)).toFixed(2));
  }
}



