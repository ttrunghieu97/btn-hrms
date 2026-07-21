import { Injectable } from "@nestjs/common";
import { eq, desc } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";

export type SessionRow = typeof schema.courseSessions.$inferSelect;
export type SessionInsert = typeof schema.courseSessions.$inferInsert;
export type SessionUpdate = Partial<SessionInsert>;
export type AttendeeRow = typeof schema.sessionAttendees.$inferSelect;
export type AttendeeInsert = typeof schema.sessionAttendees.$inferInsert;
export type InstructorInsert = typeof schema.sessionInstructors.$inferInsert;

@Injectable()
export class SessionRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();
  constructor(private readonly scopedDb: ScopedDbService) {}

  async insert(v: SessionInsert): Promise<SessionRow> {
    const [r] = await this.db.insert(schema.courseSessions).values(v).returning(); return r!;
  }
  async findById(id: string): Promise<SessionRow | null> {
    const r = await this.db.query.courseSessions.findFirst({ where: eq(schema.courseSessions.id, id) }); return r ?? null;
  }
  async findByCourse(courseId: string): Promise<SessionRow[]> {
    return this.db.query.courseSessions.findMany({ where: eq(schema.courseSessions.courseId, courseId), orderBy: desc(schema.courseSessions.scheduledAt) });
  }
  async update(id: string, v: SessionUpdate): Promise<SessionRow | null> {
    const [r] = await this.db.update(schema.courseSessions).set({ ...v, updatedAt: new Date() }).where(eq(schema.courseSessions.id, id)).returning(); return r ?? null;
  }
  async insertAttendee(v: AttendeeInsert): Promise<AttendeeRow> {
    const [r] = await this.db.insert(schema.sessionAttendees).values(v).returning(); return r!;
  }
  async findAttendee(sessionId: string, employeeId: string): Promise<AttendeeRow | null> {
    const r = await this.db.query.sessionAttendees.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.sessionId, sessionId), eq(t.employeeId, employeeId)),
    }); return r ?? null;
  }
  async updateAttendee(id: string, v: Partial<AttendeeInsert>): Promise<void> {
    await this.db.update(schema.sessionAttendees).set(v).where(eq(schema.sessionAttendees.id, id));
  }
  async insertInstructor(v: InstructorInsert): Promise<void> {
    await this.db.insert(schema.sessionInstructors).values(v);
  }
}
