import { Injectable, Inject } from "@nestjs/common";
import { eq, and, desc } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../infrastructure/database/schema";
import type {
  ScheduleRequestRecord,
  ScheduleRequestWithEmployee,
  RequestStatus,
  RequestType,
  IScheduleRequestsRepository,
} from "./schedule-requests.repository.contract";

@Injectable()
export class ScheduleRequestsRepository implements IScheduleRequestsRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {}

  async findById(id: string): Promise<ScheduleRequestRecord | null> {
    const row = await this.db.query.scheduleRequests.findFirst({
      where: eq(schema.scheduleRequests.id, id),
    });
    return row ?? null;
  }

  async findByEmployeeId(employeeId: string): Promise<ScheduleRequestWithEmployee[]> {
    return this.db.query.scheduleRequests.findMany({
      where: eq(schema.scheduleRequests.employeeId, employeeId),
      orderBy: [desc(schema.scheduleRequests.createdAt)],
      with: { employee: true },
    });
  }

  async findAll(
    filters?: { status?: string; employeeId?: string }
  ): Promise<ScheduleRequestWithEmployee[]> {
    const conditions: any[] = [];
    if (filters?.status) {
      conditions.push(eq(schema.scheduleRequests.status, filters.status as any));
    }
    if (filters?.employeeId) {
      conditions.push(eq(schema.scheduleRequests.employeeId, filters.employeeId));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.query.scheduleRequests.findMany({
      where,
      orderBy: [desc(schema.scheduleRequests.createdAt)],
      with: { employee: true },
    });
  }

  async create(values: {
    employeeId: string;
    date: string;
    requestType: RequestType;
    reason?: string;
  }): Promise<ScheduleRequestRecord> {
    const [row] = await this.db.insert(schema.scheduleRequests).values(values).returning();
    return row!;
  }

  async updateStatus(
    id: string,
    status: RequestStatus,
    reviewedBy: string
  ): Promise<ScheduleRequestRecord | null> {
    const [row] = await this.db
      .update(schema.scheduleRequests)
      .set({ status: status as any, reviewedBy, reviewedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.scheduleRequests.id, id))
      .returning();
    return row ?? null;
  }
}
