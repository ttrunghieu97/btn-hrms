import {  Inject , Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { gpsLogs } from "../../../../infrastructure/database/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { GPSLogQueryDto } from "../dto/gps-log-query.dto";

@Injectable()
export class GPSLogsRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    
    this.db = this.db;
  }

  async findMany(query: GPSLogQueryDto = {} ) {
    const { employeeId, date } = query;
    const conditions = [];

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














