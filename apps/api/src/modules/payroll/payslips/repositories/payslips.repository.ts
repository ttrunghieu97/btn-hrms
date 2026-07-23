import { Inject, Injectable } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import * as schema from "../../../../infrastructure/database/schema";
import { AppDatabase, AppTransaction } from "../../../../infrastructure/database/database-client.type";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { PayslipQueryDto } from "../dto/payslip-query.dto";
import { DataScope } from "../../../../core/security/types/data-scope.interface";

@Injectable()
export class PayslipsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {
    }

  async findById(id: string, tx: AppDatabase | AppTransaction = this.db) {
    const row = await tx.query.payslips.findFirst({
      where: eq(schema.payslips.id, id),
      with: {
        employee: { with: { department: true } },
        payrollRun: true,
      },
    });
    return row ?? null;
  }

  async findMany(query?: PayslipQueryDto) {
    if (!query) {
      return this.db.query.payslips.findMany({
        with: {
          employee: { with: { department: true } },
          payrollRun: true,
        },
        orderBy: [desc(schema.payslips.createdAt)],
      });
    }
    const { rows } = await this.list(query);
    return rows;
  }

  async list(query: PayslipQueryDto, scope?: DataScope) {
    const { page = 1, limit = 20, employeeId, payrollRunId, status } = query;
    const offset = (page - 1) * limit;
    const conditions = [];
    if (employeeId) conditions.push(eq(schema.payslips.employeeId, employeeId));
    if (payrollRunId)
      conditions.push(eq(schema.payslips.payrollRunId, payrollRunId));
    if (status) conditions.push(eq(schema.payslips.status, status as NonNullable<typeof schema.payslips.$inferInsert['status']>));

    if (scope) {
      if (scope.tier === 'self' && scope.employeeId) {
        conditions.push(eq(schema.payslips.employeeId, scope.employeeId));
      } else if (scope.tier === 'department' && scope.departmentId) {
        conditions.push(sql`EXISTS (
          SELECT 1 FROM ${schema.orgAssignments}
          WHERE ${schema.orgAssignments.employeeId} = ${schema.payslips.employeeId}
          AND ${schema.orgAssignments.departmentId} = ${scope.departmentId}
          AND ${schema.orgAssignments.isCurrent} = true
        )`);
      }
    }

    const where =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    const rows = await this.db.query.payslips.findMany({
      where,
      with: {
        employee: { with: { department: true } },
        payrollRun: true,
      },
      orderBy: [desc(schema.payslips.createdAt)],
      limit,
      offset,
    });

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.payslips)
      .where(where);

    return { rows, total: Number(totalResult?.value ?? 0), page, limit };
  }

  async create(values: typeof schema.payslips.$inferInsert) {
    const [row] = await this.db
      .insert(schema.payslips)
      .values(values)
      .returning();
    return row ?? null;
  }

  async update(
    id: string,
    values: Partial<typeof schema.payslips.$inferInsert>,
    tx: AppDatabase = this.db,
  ) {
    const [row] = await tx
      .update(schema.payslips)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.payslips.id, id))
      .returning();
    return row ?? null;
  }

  async transaction<T>(callback: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }

  async delete(id: string) {
    await this.db.delete(schema.payslips).where(eq(schema.payslips.id, id));
  }
}









