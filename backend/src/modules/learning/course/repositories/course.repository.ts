import { Injectable } from "@nestjs/common";
import { eq, desc } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";

export type CourseRow = typeof schema.courses.$inferSelect;
export type CourseInsert = typeof schema.courses.$inferInsert;
export type CourseUpdate = Partial<CourseInsert>;
export type EnrollmentRow = typeof schema.courseEnrollments.$inferSelect;
export type EnrollmentInsert = typeof schema.courseEnrollments.$inferInsert;
export type AssignmentRow = typeof schema.learningAssignments.$inferSelect;
export type AssignmentInsert = typeof schema.learningAssignments.$inferInsert;
export type EnrollmentUpdate = Partial<EnrollmentInsert>;

@Injectable()
export class CourseRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();
  constructor(private readonly scopedDb: ScopedDbService) {}

  async insertCourse(v: CourseInsert): Promise<CourseRow> {
    const [r] = await this.db.insert(schema.courses).values(v).returning(); return r!;
  }
  async findCourseById(id: string): Promise<CourseRow | null> {
    const r = await this.db.query.courses.findFirst({ where: eq(schema.courses.id, id) }); return r ?? null;
  }
  async findCourses(): Promise<CourseRow[]> {
    return this.db.query.courses.findMany({ orderBy: desc(schema.courses.createdAt) });
  }
  async updateCourse(id: string, v: CourseUpdate): Promise<CourseRow | null> {
    const [r] = await this.db.update(schema.courses).set({ ...v, updatedAt: new Date() }).where(eq(schema.courses.id, id)).returning(); return r ?? null;
  }
  async insertEnrollment(v: EnrollmentInsert): Promise<EnrollmentRow> {
    const [r] = await this.db.insert(schema.courseEnrollments).values(v).returning(); return r!;
  }
  async findEnrollmentsByEmployee(employeeId: string): Promise<EnrollmentRow[]> {
    return this.db.query.courseEnrollments.findMany({ where: eq(schema.courseEnrollments.employeeId, employeeId) });
  }
  async findEnrollmentById(id: string): Promise<EnrollmentRow | null> {
    const r = await this.db.query.courseEnrollments.findFirst({ where: eq(schema.courseEnrollments.id, id) }); return r ?? null;
  }
  async updateEnrollment(id: string, v: EnrollmentUpdate): Promise<EnrollmentRow | null> {
    const [r] = await this.db.update(schema.courseEnrollments).set({ ...v, updatedAt: new Date() }).where(eq(schema.courseEnrollments.id, id)).returning(); return r ?? null;
  }
  async insertAssignment(v: AssignmentInsert): Promise<AssignmentRow> {
    const [r] = await this.db.insert(schema.learningAssignments).values(v).returning(); return r!;
  }
}
