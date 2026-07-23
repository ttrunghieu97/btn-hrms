import { Injectable } from "@nestjs/common";
import { count, eq, and, inArray } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";

export type ReviewAssignmentRow = typeof schema.reviewAssignments.$inferSelect;
export type ReviewAssignmentInsert = typeof schema.reviewAssignments.$inferInsert;
export type ReviewAssignmentUpdate = Partial<ReviewAssignmentInsert>;
export type ReviewRatingRow = typeof schema.reviewRatings.$inferSelect;
export type ReviewRatingInsert = typeof schema.reviewRatings.$inferInsert;

@Injectable()
export class ReviewAssignmentRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();

  constructor(private readonly scopedDb: ScopedDbService) {}

  async insert(values: ReviewAssignmentInsert): Promise<ReviewAssignmentRow> {
    const [row] = await this.db.insert(schema.reviewAssignments).values(values).returning();
    return row!;
  }

  async findById(id: string): Promise<ReviewAssignmentRow | null> {
    const row = await this.db.query.reviewAssignments.findFirst({
      where: eq(schema.reviewAssignments.id, id),
    });
    return row ?? null;
  }

  async findByEmployee(employeeId: string, cycleId?: string): Promise<ReviewAssignmentRow[]> {
    const conditions = [eq(schema.reviewAssignments.employeeId, employeeId)];
    if (cycleId) conditions.push(eq(schema.reviewAssignments.cycleId, cycleId));
    return this.db.query.reviewAssignments.findMany({
      where: and(...conditions),
    });
  }

  async findPendingByReviewer(
    reviewerId: string,
    cycleId?: string,
  ): Promise<ReviewAssignmentRow[]> {
    const conditions = [
      eq(schema.reviewAssignments.reviewerId, reviewerId),
      eq(schema.reviewAssignments.status, "pending"),
    ];
    if (cycleId) conditions.push(eq(schema.reviewAssignments.cycleId, cycleId));
    return this.db.query.reviewAssignments.findMany({
      where: and(...conditions),
    });
  }

  async update(id: string, values: ReviewAssignmentUpdate): Promise<ReviewAssignmentRow | null> {
    const [row] = await this.db
      .update(schema.reviewAssignments)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.reviewAssignments.id, id))
      .returning();
    return row ?? null;
  }

  async insertRating(values: ReviewRatingInsert): Promise<ReviewRatingRow> {
    const [row] = await this.db.insert(schema.reviewRatings).values(values).returning();
    return row!;
  }

  async findRatings(reviewAssignmentId: string): Promise<ReviewRatingRow[]> {
    return this.db.query.reviewRatings.findMany({
      where: eq(schema.reviewRatings.reviewAssignmentId, reviewAssignmentId),
    });
  }

  async countByCycle(cycleId: string): Promise<{
    total: number;
    submitted: number;
  }> {
    const all = await this.db.query.reviewAssignments.findMany({
      where: eq(schema.reviewAssignments.cycleId, cycleId),
      columns: { status: true },
    });
    return {
      total: all.length,
      submitted: all.filter((r) => r.status === "submitted").length,
    };
  }
}
