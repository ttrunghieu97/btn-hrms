import { Injectable } from "@nestjs/common";
import { eq, desc, and } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";

export type PathRow = typeof schema.learningPaths.$inferSelect;
export type PathInsert = typeof schema.learningPaths.$inferInsert;
export type PathCourseInsert = typeof schema.learningPathCourses.$inferInsert;
export type AssignmentRow = typeof schema.learningPathAssignments.$inferSelect;
export type AssignmentInsert = typeof schema.learningPathAssignments.$inferInsert;
export type ProgressRow = typeof schema.learningPathProgress.$inferSelect;
export type ProgressInsert = typeof schema.learningPathProgress.$inferInsert;

@Injectable()
export class LearningPathRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();
  constructor(private readonly scopedDb: ScopedDbService) {}

  async insertPath(v: PathInsert): Promise<PathRow> {
    const [r] = await this.db.insert(schema.learningPaths).values(v).returning(); return r!;
  }
  async findPathById(id: string): Promise<PathRow | null> {
    const r = await this.db.query.learningPaths.findFirst({ where: eq(schema.learningPaths.id, id) }); return r ?? null;
  }
  async findPaths(): Promise<PathRow[]> { return this.db.query.learningPaths.findMany({ orderBy: desc(schema.learningPaths.createdAt) }); }
  async updatePath(id: string, v: Partial<PathInsert>): Promise<void> {
    await this.db.update(schema.learningPaths).set({ ...v, updatedAt: new Date() }).where(eq(schema.learningPaths.id, id));
  }
  async addPathCourse(v: PathCourseInsert): Promise<void> { await this.db.insert(schema.learningPathCourses).values(v); }
  async insertAssignment(v: AssignmentInsert): Promise<AssignmentRow> {
    const [r] = await this.db.insert(schema.learningPathAssignments).values(v).returning(); return r!;
  }
  async findAssignment(pathId: string, employeeId: string): Promise<AssignmentRow | null> {
    const r = await this.db.query.learningPathAssignments.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.pathId, pathId), eq(t.employeeId, employeeId)),
    }); return r ?? null;
  }
  async updateAssignment(id: string, v: Partial<AssignmentInsert>): Promise<void> {
    await this.db.update(schema.learningPathAssignments).set(v).where(eq(schema.learningPathAssignments.id, id));
  }
  async upsertProgress(v: ProgressInsert): Promise<void> {
    const existing = await this.db.query.learningPathProgress.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.pathId, v.pathId), eq(t.employeeId, v.employeeId), eq(t.courseId, v.courseId)),
    });
    if (existing) {
      await this.db.update(schema.learningPathProgress).set({ completed: v.completed, completedAt: v.completedAt ?? null }).where(eq(schema.learningPathProgress.id, existing.id));
    } else {
      await this.db.insert(schema.learningPathProgress).values(v);
    }
  }
  async countCompletedCourses(pathId: string, employeeId: string): Promise<number> {
    const rows = await this.db.query.learningPathProgress.findMany({
      where: (t: any, { and, eq }: any) => and(eq(t.pathId, pathId), eq(t.employeeId, employeeId), eq(t.completed, true)),
    }); return rows.length;
  }
  async countTotalCourses(pathId: string): Promise<number> {
    const rows = await this.db.query.learningPathCourses.findMany({ where: eq(schema.learningPathCourses.pathId, pathId) }); return rows.length;
  }
}
