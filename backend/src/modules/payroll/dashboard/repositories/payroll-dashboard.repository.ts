import { Injectable } from "@nestjs/common";
import { count, eq, sql, desc, sum } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";

export type PayslipStats = {
  draftCount: number | null;
  publishedCount: number | null;
  totalGross: string | null;
  totalDeductions: string | null;
  totalNet: string | null;
  employeeCount: number | null;
};

export type RecentRun = {
  id: string;
  status: string;
  periodName: string | null;
  createdAt: Date;
  processedAt: Date | null;
};

export type DraftPayslip = {
  id: string;
  employeeName: string;
  employeeCode: string | null;
  netPay: string | null;
  createdAt: Date;
  payrollRunId: string | null;
};

export type CostTrend = {
  periodId: string;
  periodName: string | null;
  totalGross: number;
  employeeCount: number;
};

@Injectable()
export class PayrollDashboardRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();

  constructor(private readonly scopedDb: ScopedDbService) {}

  async getLatestPeriodName(): Promise<string> {
    const [latestPeriod] = await this.db
      .select()
      .from(schema.payrollPeriods)
      .orderBy(desc(schema.payrollPeriods.startsOn))
      .limit(1);
    return latestPeriod?.name ?? "—";
  }

  async getPayslipStats(): Promise<PayslipStats> {
    const [stats] = await this.db
      .select({
        draftCount: count(sql`CASE WHEN ${schema.payslips.status} = 'draft' THEN 1 END`),
        publishedCount: count(sql`CASE WHEN ${schema.payslips.status} = 'published' THEN 1 END`),
        totalGross: sum(schema.payslips.grossPay),
        totalDeductions: sum(schema.payslips.totalDeductions),
        totalNet: sum(schema.payslips.netPay),
        employeeCount: count(sql`DISTINCT ${schema.payslips.employeeId}`),
      })
      .from(schema.payslips);
    return {
      draftCount: Number(stats?.draftCount ?? 0),
      publishedCount: Number(stats?.publishedCount ?? 0),
      totalGross: stats?.totalGross?.toString() ?? null,
      totalDeductions: stats?.totalDeductions?.toString() ?? null,
      totalNet: stats?.totalNet?.toString() ?? null,
      employeeCount: Number(stats?.employeeCount ?? 0),
    };
  }

  async getRecentRuns(limit = 5): Promise<RecentRun[]> {
    return this.db
      .select({
        id: schema.payrollRuns.id,
        status: schema.payrollRuns.status,
        periodName: schema.payrollPeriods.name,
        createdAt: schema.payrollRuns.createdAt,
        processedAt: schema.payrollRuns.processedAt,
      })
      .from(schema.payrollRuns)
      .leftJoin(
        schema.payrollPeriods,
        eq(schema.payrollRuns.payrollPeriodId, schema.payrollPeriods.id),
      )
      .orderBy(desc(schema.payrollRuns.createdAt))
      .limit(limit);
  }

  async getDraftPayslips(limit = 5): Promise<DraftPayslip[]> {
    return this.db
      .select({
        id: schema.payslips.id,
        employeeName: sql<string>`CONCAT(${schema.employees.firstName}, ' ', ${schema.employees.lastName})`,
        employeeCode: schema.employees.employeeCode,
        netPay: schema.payslips.netPay,
        createdAt: schema.payslips.createdAt,
        payrollRunId: schema.payslips.payrollRunId,
      })
      .from(schema.payslips)
      .innerJoin(
        schema.employees,
        eq(schema.payslips.employeeId, schema.employees.id),
      )
      .where(eq(schema.payslips.status, "draft"))
      .orderBy(desc(schema.payslips.createdAt))
      .limit(limit);
  }

  async getCostTrend(limit = 6): Promise<CostTrend[]> {
    return this.db
      .select({
        periodId: schema.payrollPeriods.id,
        periodName: schema.payrollPeriods.name,
        totalGross: sum(schema.payrollItems.amount)
          .mapWith(Number)
          .as("total_gross"),
        employeeCount: count(sql`DISTINCT ${schema.payrollItems.employeeId}`),
      })
      .from(schema.payrollItems)
      .innerJoin(
        schema.payrollPeriods,
        eq(schema.payrollItems.payrollRunId, schema.payrollPeriods.id),
      )
      .groupBy(schema.payrollPeriods.id, schema.payrollPeriods.name)
      .orderBy(desc(schema.payrollPeriods.startsOn))
      .limit(limit);
  }
}
