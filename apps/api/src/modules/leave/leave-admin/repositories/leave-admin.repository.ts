import {  Inject , Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../infrastructure/database/schema";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { BaseRepository } from "../../../../infrastructure/repositories/base.repository";
import { LeaveAdminQueryDto } from "../dto/leave-admin-query.dto";

@Injectable()
export class LeaveAdminRepository extends BaseRepository<unknown, any, unknown> {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    super();
    this.db = this.db;
  }

  async findById(id: string) {
    return this.db.query.leavePolicies.findFirst({
      where: eq(schema.leavePolicies.id, id),
    });
  }

  async findMany(options?: any  ) {
    if (options?.target === "types")
      return this.listLeaveTypes(options).then((r) => r.rows);
    return this.listLeavePolicies(options).then((r) => r.rows);
  }

  async create(data: any  ) {
    if (data.target === "type") {
      const [row] = await this.db
        .insert(schema.leaveTypes)
        .values({ ...data.values })
        .returning();
      return row ?? null;
    }
    const [row] = await this.db
      .insert(schema.leavePolicies)
      .values({ ...data.values })
      .returning();
    return row ?? null;
  }

  async update(id: string, data: any  ) {
    if (data.target === "type") {
      const [row] = await this.db
        .update(schema.leaveTypes)
        .set({ ...data.values, updatedAt: new Date() })
        .where(eq(schema.leaveTypes.id, id))
        .returning();
      return row ?? null;
    }
    const [row] = await this.db
      .update(schema.leavePolicies)
      .set({ ...data.values, updatedAt: new Date() })
      .where(eq(schema.leavePolicies.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(schema.leavePolicies)
      .where(eq(schema.leavePolicies.id, id));
  }

  async deleteLeaveType(id: string): Promise<void> {
    await this.db
      .delete(schema.leaveTypes)
      .where(eq(schema.leaveTypes.id, id));
  }

  async getLeavePolicy(id: string) {
    return this.db.query.leavePolicies.findFirst({
      where: eq(schema.leavePolicies.id, id),
    });
  }

  async getLeaveType(id: string) {
    return this.db.query.leaveTypes.findFirst({
      where: eq(schema.leaveTypes.id, id),
    });
  }

  async listLeavePolicies(query: LeaveAdminQueryDto = new LeaveAdminQueryDto()) {
    const { page = 1, limit = 20, search } = query;
    const offset = (page - 1) * limit;
    const conditions = [];
    if (search)
      conditions.push(
        or(
          ilike(schema.leavePolicies.name, `%${search}%`),
          ilike(schema.leavePolicies.code, `%${search}%`),
        )!,
      );
    const where = conditions.length
      ? conditions.length === 1
        ? conditions[0]
        : and(...conditions)
      : undefined;
    const rows = await this.db.query.leavePolicies.findMany({
      where,
      orderBy: [desc(schema.leavePolicies.createdAt)],
      limit,
      offset,
    });
    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.leavePolicies)
      .where(where);
    return { rows, total: Number(totalResult?.value ?? 0), page, limit };
  }

  async listLeaveTypes(query: LeaveAdminQueryDto = new LeaveAdminQueryDto()) {
    const { page = 1, limit = 20, search } = query;
    const offset = (page - 1) * limit;
    const conditions = [];
    if (search)
      conditions.push(
        or(
          ilike(schema.leaveTypes.name, `%${search}%`),
          ilike(schema.leaveTypes.code, `%${search}%`),
        )!,
      );
    const where = conditions.length
      ? conditions.length === 1
        ? conditions[0]
        : and(...conditions)
      : undefined;
    const rows = await this.db.query.leaveTypes.findMany({
      where,
      orderBy: [desc(schema.leaveTypes.createdAt)],
      limit,
      offset,
    });
    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.leaveTypes)
      .where(where);
    return { rows, total: Number(totalResult?.value ?? 0), page, limit };
  }
}










