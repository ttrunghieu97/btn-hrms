import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { employees, gpsLogs } from "../../../../infrastructure/database/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { GPSLogQueryDto } from "../dto/gps-log-query.dto";
import { DataScope } from "../../../../core/security/types/data-scope.interface";

@Injectable()
export class GPSLogsRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  async findMany(query: GPSLogQueryDto = {}, scope?: DataScope) {
    const { employeeId, date } = query;
    const conditions = [];

    if (scope?.tier === "self") {
      if (!scope.employeeId) return [];
      conditions.push(eq(gpsLogs.employeeId, scope.employeeId));
    } else if (scope?.tier === "department") {
      if (!scope.departmentId) return [];
      const deptEmpSubquery = this.db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.departmentId, scope.departmentId));
      conditions.push(inArray(gpsLogs.employeeId, deptEmpSubquery));
    }

    if (employeeId) conditions.push(eq(gpsLogs.employeeId, employeeId));
    if (date) conditions.push(sql`DATE(${gpsLogs.timestamp}) = ${date}`);

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.query.gpsLogs.findMany({
      where,
      orderBy: [desc(gpsLogs.timestamp)],
    });
  }

  async findById(id: string) {
    return this.db.query.gpsLogs.findFirst({
      where: eq(gpsLogs.id, id),
    });
  }

  async create(data: typeof gpsLogs.$inferInsert) {
    const [row] = await this.db
      .insert(gpsLogs)
      .values(data)
      .returning();
    return row ?? null;
  }

  async update(id: string, data: Partial<typeof gpsLogs.$inferInsert>) {
    const [row] = await this.db
      .update(gpsLogs)
      .set({ ...data })
      .where(eq(gpsLogs.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(gpsLogs).where(eq(gpsLogs.id, id));
  }
}














