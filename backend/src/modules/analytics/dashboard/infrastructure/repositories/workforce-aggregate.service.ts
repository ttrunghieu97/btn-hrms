import { formatDateISO } from "@/shared/utils/date-format";
import { Injectable } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql, and, gte, lt, isNull, eq, count } from "drizzle-orm";
import { ScopedDbService } from "../../../../../infrastructure/database/scoped-db.service";
import type { DashboardContext } from "../../application/interfaces/dashboard-context.interface";
import * as schema from "../../../../../infrastructure/database/schema";

export interface WorkforceSnapshot {
  totalEmployees: number;
  activeEmployees: number;
  probationEmployees: number;
  terminatedEmployees: number;
}

export interface DepartmentHeadcount {
  departmentId: string;
  departmentName: string;
  count: number;
}

export interface EmployeeStatusDistribution {
  status: string;
  count: number;
}

export interface HiresLeaversTrend {
  month: string;
  hires: number;
  leavers: number;
}

export interface GenderDistribution {
  gender: string | null;
  count: number;
}

export interface BranchHeadcount {
  branchId: string;
  branchName: string;
  count: number;
}

@Injectable()
export class WorkforceAggregateService {
  constructor(
    private readonly scopedDb: ScopedDbService,
  ) {}

  private get db(): PostgresJsDatabase<typeof schema> {
    return this.scopedDb.getDb<typeof schema>();
  }

  async getSnapshot(): Promise<WorkforceSnapshot> {
    const [row] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(CASE WHEN ${schema.employees.status} = 'working' THEN 1 END)::int`,
        probation: sql<number>`count(CASE WHEN ${schema.employees.status} = 'probation' THEN 1 END)::int`,
        terminated: sql<number>`count(CASE WHEN ${schema.employees.status} = 'terminated' THEN 1 END)::int`,
      })
      .from(schema.employees)
      .where(isNull(schema.employees.deletedAt));

    return {
      totalEmployees: row?.total ?? 0,
      activeEmployees: row?.active ?? 0,
      probationEmployees: row?.probation ?? 0,
      terminatedEmployees: row?.terminated ?? 0,
    };
  }

  async getStatusDistribution(_ctx?: DashboardContext): Promise<EmployeeStatusDistribution[]> {
    return this.db
      .select({
        status: schema.employees.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.employees)
      .where(isNull(schema.employees.deletedAt))
      .groupBy(schema.employees.status)
      .orderBy(schema.employees.status);
  }

  async getDepartmentHeadcounts(): Promise<DepartmentHeadcount[]> {
    return this.db
      .select({
        departmentId: schema.departments.id,
        departmentName: schema.departments.name,
        count: sql<number>`count(${schema.employees.id})::int`,
      })
      .from(schema.departments)
      .leftJoin(
        schema.employees,
        and(
          eq(schema.employees.departmentId, schema.departments.id),
          isNull(schema.employees.deletedAt),
        ),
      )
      .groupBy(schema.departments.id, schema.departments.name)
      .orderBy(schema.departments.name);
  }

  async getHiresLeaversTrend(
    from: Date,
    to: Date,
  ): Promise<HiresLeaversTrend[]> {
    const rows = await this.db
      .select({
        month: sql<string>`to_char(${schema.employees.createdAt}, 'YYYY-MM')`,
        hires: sql<number>`count(*)::int`,
      })
      .from(schema.employees)
      .where(
        and(
          gte(schema.employees.createdAt, from),
          lt(schema.employees.createdAt, to),
          isNull(schema.employees.deletedAt),
        ),
      )
      .groupBy(sql`to_char(${schema.employees.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${schema.employees.createdAt}, 'YYYY-MM')`);

    const leavers = await this.db
      .select({
        month: sql<string>`to_char(${schema.employees.endDate}, 'YYYY-MM')`,
        leavers: sql<number>`count(*)::int`,
      })
      .from(schema.employees)
      .where(
        and(
          gte(schema.employees.endDate, formatDateISO(from) ?? ""),
          lt(schema.employees.endDate, formatDateISO(to) ?? ""),
          isNull(schema.employees.deletedAt),
        ),
      )
      .groupBy(sql`to_char(${schema.employees.endDate}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${schema.employees.endDate}, 'YYYY-MM')`);

    // Merge rows
    const monthMap = new Map<string, { hires: number; leavers: number }>();
    for (const r of rows) {
      monthMap.set(r.month, { hires: r.hires, leavers: 0 });
    }
    for (const r of leavers) {
      const existing = monthMap.get(r.month) ?? { hires: 0, leavers: 0 };
      existing.leavers = r.leavers;
      monthMap.set(r.month, existing);
    }

    return Array.from(monthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  async getGenderDistribution(): Promise<GenderDistribution[]> {
    return this.db
      .select({
        gender: schema.employees.gender,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.employees)
      .where(isNull(schema.employees.deletedAt))
      .groupBy(schema.employees.gender)
      .orderBy(schema.employees.gender);
  }

  async getBranchHeadcounts(): Promise<BranchHeadcount[]> {
    return this.db
      .select({
        branchId: schema.branches.id,
        branchName: schema.branches.name,
        count: sql<number>`count(${schema.employees.id})::int`,
      })
      .from(schema.branches)
      .leftJoin(
        schema.employees,
        and(
          eq(schema.employees.branchId, schema.branches.id),
          isNull(schema.employees.deletedAt),
        ),
      )
      .groupBy(schema.branches.id, schema.branches.name)
      .orderBy(schema.branches.name);
  }
}
