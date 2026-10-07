import { Injectable } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql, desc, eq } from "drizzle-orm";
import { ScopedDbService } from "../../../../../infrastructure/database/scoped-db.service";
import * as schema from "../../../../../infrastructure/database/schema";

export interface PayrollCostTrend {
  periodId: string;
  periodName: string;
  totalGross: number;
  totalNet: number;
  employeeCount: number;
}

export interface PayrollCostSummary {
  totalGross: number;
  totalNet: number;
  totalEmployerContributions: number;
  employeeCount: number;
}

@Injectable()
export class PayrollAggregateService {
  constructor(
    private readonly scopedDb: ScopedDbService,
  ) {}

  private get db(): PostgresJsDatabase<typeof schema> {
    return this.scopedDb.getDb<typeof schema>();
  }

  async getLatestCostSummary(): Promise<PayrollCostSummary> {
    const [row] = await this.db
      .select({
        totalGross:
          sql<string>`coalesce(sum(${schema.payrollCostSummaries.totalGross}), '0')`,
        totalNet:
          sql<string>`coalesce(sum(${schema.payrollCostSummaries.totalNet}), '0')`,
        totalEmployerContributions:
          sql<string>`coalesce(sum(${schema.payrollCostSummaries.totalEmployerContributions}), '0')`,
        employeeCount:
          sql<number>`coalesce(sum(${schema.payrollCostSummaries.employeeCount}), 0)::int`,
      })
      .from(schema.payrollCostSummaries)
      .innerJoin(
        schema.payrollPeriods,
        eq(
          schema.payrollCostSummaries.payrollPeriodId,
          schema.payrollPeriods.id,
        ),
      )
      .orderBy(desc(schema.payrollPeriods.startsOn))
      .limit(1);

    return {
      totalGross: Number(row?.totalGross ?? 0),
      totalNet: Number(row?.totalNet ?? 0),
      totalEmployerContributions: Number(row?.totalEmployerContributions ?? 0),
      employeeCount: row?.employeeCount ?? 0,
    };
  }

  async getCostTrend(limit = 6): Promise<PayrollCostTrend[]> {
    const rows = await this.db
      .select({
        periodId: schema.payrollCostSummaries.payrollPeriodId,
        periodName: schema.payrollPeriods.name,
        totalGross:
          sql<string>`coalesce(sum(${schema.payrollCostSummaries.totalGross}), '0')`,
        totalNet:
          sql<string>`coalesce(sum(${schema.payrollCostSummaries.totalNet}), '0')`,
        employeeCount:
          sql<number>`coalesce(sum(${schema.payrollCostSummaries.employeeCount}), 0)::int`,
      })
      .from(schema.payrollCostSummaries)
      .innerJoin(
        schema.payrollPeriods,
        eq(
          schema.payrollCostSummaries.payrollPeriodId,
          schema.payrollPeriods.id,
        ),
      )
      .groupBy(
        schema.payrollCostSummaries.payrollPeriodId,
        schema.payrollPeriods.name,
        schema.payrollPeriods.startsOn,
      )
      .orderBy(desc(schema.payrollPeriods.startsOn))
      .limit(limit);

    return rows.map((r) => ({
      periodId: r.periodId,
      periodName: r.periodName,
      totalGross: Number(r.totalGross ?? 0),
      totalNet: Number(r.totalNet ?? 0),
      employeeCount: r.employeeCount ?? 0,
    }));
  }
}
