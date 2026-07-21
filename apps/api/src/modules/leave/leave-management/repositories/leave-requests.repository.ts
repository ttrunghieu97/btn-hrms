import {  Inject , Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../infrastructure/database/schema";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { BaseRepository } from "../../../../infrastructure/repositories/base.repository";
import { LeaveRequestQueryDto } from "../dto/leave-request-query.dto";

@Injectable()
export class LeaveRequestsRepository extends BaseRepository<
  typeof schema.leaveRequests.$inferSelect,
  typeof schema.leaveRequests.$inferInsert,
  Partial<typeof schema.leaveRequests.$inferInsert>
> {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    super();
    this.db = this.db;
  }

  async findById(id: string) {
    const row = await this.db.query.leaveRequests.findFirst({
      where: eq(schema.leaveRequests.id, id),
      with: {
        employee: { with: { department: true } },
        leaveType: true,
        approver: true,
      },
    });
    return row ?? null;
  }

  async findMany(query?: LeaveRequestQueryDto) {
    if (!query) {
      return this.db.query.leaveRequests.findMany({
        with: {
          employee: { with: { department: true } },
          leaveType: true,
          approver: true,
        },
        orderBy: [desc(schema.leaveRequests.requestedAt)],
      });
    }
    const { rows } = await this.list(query);
    return rows;
  }

  async list(query: LeaveRequestQueryDto) {
    const { page = 1, limit = 20, employeeId, status, search } = query;
    const offset = (page - 1) * limit;
    const conditions = [];

    if (employeeId) {
      conditions.push(eq(schema.leaveRequests.employeeId, employeeId));
    }
    if (status) {
      conditions.push(eq(schema.leaveRequests.status, status as NonNullable<typeof schema.leaveRequests.$inferInsert['status']>));
    }
    if (search) {
      conditions.push(
        or(
          ilike(schema.leaveTypes.name, `%${search}%`),
          ilike(schema.employees.firstName, `%${search}%`),
          ilike(schema.employees.lastName, `%${search}%`),
          ilike(schema.employees.employeeCode, `%${search}%`),
        )!,
      );
    }

    const where =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    const rows = await this.db
      .select({ id: schema.leaveRequests.id })
      .from(schema.leaveRequests)
      .innerJoin(
        schema.leaveTypes,
        eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id),
      )
      .innerJoin(
        schema.employees,
        eq(schema.leaveRequests.employeeId, schema.employees.id),
      )
      .where(where)
      .orderBy(desc(schema.leaveRequests.requestedAt))
      .limit(limit)
      .offset(offset);

    const hydratedRows = rows.length
      ? await this.db.query.leaveRequests.findMany({
          where: inArray(
            schema.leaveRequests.id,
            rows.map((row) => row.id),
          ),
          with: {
            employee: { with: { department: true } },
            leaveType: true,
            approver: true,
          },
          orderBy: [desc(schema.leaveRequests.requestedAt)],
        })
      : [];

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.leaveRequests)
      .innerJoin(
        schema.leaveTypes,
        eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id),
      )
      .innerJoin(
        schema.employees,
        eq(schema.leaveRequests.employeeId, schema.employees.id),
      )
      .where(where);

    return {
      rows: hydratedRows,
      total: Number(totalResult?.value ?? 0),
      page,
      limit,
    };
  }

  async create(values: typeof schema.leaveRequests.$inferInsert) {
    const [row] = await this.db
      .insert(schema.leaveRequests)
      .values(values)
      .returning();
    return row ?? null;
  }

  async update(
    id: string,
    values: Partial<typeof schema.leaveRequests.$inferInsert>,
    tx?: AppDatabase,
  ) {
    const db = tx ?? this.db;
    const [row] = await db
      .update(schema.leaveRequests)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.leaveRequests.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string) {
    await this.db
      .delete(schema.leaveRequests)
      .where(eq(schema.leaveRequests.id, id));
  }

  async findPendingByEmployee(employeeId: string) {
    const rows = await this.db.query.leaveRequests.findMany({
      where: and(
        eq(schema.leaveRequests.employeeId, employeeId),
        eq(schema.leaveRequests.status, "pending"),
      ),
    });
    return rows ?? [];
  }

  findEmployeeById(employeeId: string) {
    return this.db.query.employees.findFirst({
      where: eq(schema.employees.id, employeeId),
    });
  }

  findLeaveTypeById(leaveTypeId: string) {
    return this.db.query.leaveTypes.findFirst({
      where: eq(schema.leaveTypes.id, leaveTypeId),
    });
  }

  listBalancesByEmployee(employeeId: string) {
    return this.db.query.leaveBalances.findMany({
      where: eq(schema.leaveBalances.employeeId, employeeId),
      with: { leaveType: true },
      orderBy: [desc(schema.leaveBalances.balanceYear)],
    });
  }

  findBalanceForYear(
    employeeId: string,
    leaveTypeId: string,
    balanceYear: number,
  ) {
    return this.db.query.leaveBalances.findFirst({
      where: and(
        eq(schema.leaveBalances.employeeId, employeeId),
        eq(schema.leaveBalances.leaveTypeId, leaveTypeId),
        eq(schema.leaveBalances.balanceYear, balanceYear),
      ),
      with: { leaveType: true },
    });
  }

  async incrementUsedBalance(balanceId: string, units: string, tx?: AppDatabase) {
    const db = tx ?? this.db;
    const [row] = await db
      .update(schema.leaveBalances)
      .set({
        usedAmount: sql`${schema.leaveBalances.usedAmount} + ${units}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.leaveBalances.id, balanceId))
      .returning();
    return row ?? null;
  }

  async decrementUsedBalance(balanceId: string, units: string, tx?: AppDatabase) {
    const db = tx ?? this.db;
    const [row] = await db
      .update(schema.leaveBalances)
      .set({
        usedAmount: sql`GREATEST(0, ${schema.leaveBalances.usedAmount} - ${units})`,
        updatedAt: new Date(),
      })
      .where(eq(schema.leaveBalances.id, balanceId))
      .returning();
    return row ?? null;
  }

  findApplicablePolicyAssignment(employeeId: string, onDate: string) {
    return this.db.query.leavePolicyAssignments.findFirst({
      where: and(
        eq(schema.leavePolicyAssignments.employeeId, employeeId),
        lte(schema.leavePolicyAssignments.effectiveFrom, onDate),
        or(
          isNull(schema.leavePolicyAssignments.effectiveTo),
          gte(schema.leavePolicyAssignments.effectiveTo, onDate),
        ),
      ),
      with: { policy: true },
    });
  }

  async findOverlappingApprovedRequest(
    employeeId: string,
    startDate: string,
    endDate: string,
    excludeRequestId?: string,
  ) {
    const conditions = [
      eq(schema.leaveRequests.employeeId, employeeId),
      eq(schema.leaveRequests.status, "approved"),
      lte(schema.leaveRequests.startDate, endDate),
      gte(schema.leaveRequests.endDate, startDate),
    ];

    if (excludeRequestId) {
      conditions.push(ne(schema.leaveRequests.id, excludeRequestId));
    }

    return this.db.query.leaveRequests.findFirst({
      where: and(...conditions),
    });
  }

  transaction<T>(callback: (tx: AppDatabase) => Promise<T>) {
    return this.db.transaction(callback);
  }

  async createAuditLog(
    actorUserId: string | null,
    action: string,
    entityId: string,
    metadata: unknown,
    tx?: AppDatabase,
  ) {
    const db = tx ?? this.db;
    const [row] = await db
      .insert(schema.auditLogs)
      .values({
        actorUserId,
        action,
        entity: "leave_request",
        entityId,
        metadata,
      })
      .returning();
    return row ?? null;
  }
}
