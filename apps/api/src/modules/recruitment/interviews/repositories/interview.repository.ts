import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";
import type { SubmitScorecardDto } from "../dto/interview.dto";

export type InterviewRow = typeof schema.interviews.$inferSelect;
export type InterviewInsert = typeof schema.interviews.$inferInsert;
export type InterviewUpdate = Partial<InterviewInsert>;

@Injectable()
export class InterviewRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();
  constructor(private readonly scopedDb: ScopedDbService) {}

  async insert(values: InterviewInsert): Promise<InterviewRow> {
    const [row] = await this.db.insert(schema.interviews).values(values).returning();
    return row!;
  }

  async findById(id: string): Promise<InterviewRow | null> {
    const row = await this.db.query.interviews.findFirst({ where: eq(schema.interviews.id, id) });
    return row ?? null;
  }

  async findByApplication(applicationId: string): Promise<InterviewRow[]> {
    return this.db.query.interviews.findMany({ where: eq(schema.interviews.applicationId, applicationId) });
  }

  async update(id: string, values: InterviewUpdate): Promise<InterviewRow | null> {
    const [row] = await this.db.update(schema.interviews).set({ ...values, updatedAt: new Date() }).where(eq(schema.interviews.id, id)).returning();
    return row ?? null;
  }

  async insertScorecard(applicationId: string, interviewerUserId: string, dto: SubmitScorecardDto): Promise<void> {
    const [scorecard] = await this.db.insert(schema.interviewScorecards).values({
      applicationId, interviewerUserId, rating: dto.rating, feedback: dto.feedback ?? null,
    }).returning();
    if (!scorecard) return;
    if (dto.rubric) {
      for (const r of dto.rubric) {
        await this.db.insert(schema.interviewRubricScores).values({
          scorecardId: scorecard.id, category: r.category, score: r.score, comment: r.comment ?? null,
        });
      }
    }
  }
}
