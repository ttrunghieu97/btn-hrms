import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, ne } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import type { CandidateQueryDto } from "../dto/candidate-query.dto";

export type CandidateValues = typeof schema.candidates.$inferInsert;
export type ApplicationValues = typeof schema.applications.$inferInsert;
export type ApplicationStageEventValues =
  typeof schema.applicationStageEvents.$inferInsert;
export type InterviewScorecardValues =
  typeof schema.interviewScorecards.$inferInsert;
export type ApplicationStage = NonNullable<ApplicationValues["currentStage"]>;

export type CandidateRow = typeof schema.candidates.$inferSelect;
export type ApplicationRow = typeof schema.applications.$inferSelect;
export type StageEventRow = typeof schema.applicationStageEvents.$inferSelect;
export type ScorecardRow = typeof schema.interviewScorecards.$inferSelect;
export type HydratedApplication = ApplicationRow & {
  candidate?: CandidateRow | null;
  posting?: typeof schema.jobPostings.$inferSelect | null;
  stageEvents?: StageEventRow[];
  scorecards?: ScorecardRow[];
};

/**
 * Stages that count as "closed" — an application in one of these stages is no
 * longer active and does not block a fresh application to the same posting.
 */
export const TERMINAL_STAGES = ["rejected", "withdrawn"] as const;

/**
 * Shared repository for candidates + applications. Owned by the candidates
 * sub-module and re-used by the pipeline and offers sub-modules (imported via
 * CandidatesModule exports); do not duplicate it.
 */
@Injectable()
export class ApplicationsRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();
  constructor(
    private readonly scopedDb: ScopedDbService,
  ) {}

  transaction<T>(fn: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async findCandidateByEmail(email: string, db: AppDatabase = this.db) {
    const normalized = this.normalizeEmail(email);
    const row = await db.query.candidates.findFirst({
      where: eq(schema.candidates.email, normalized),
    });
    return row ?? null;
  }

  async createCandidate(values: CandidateValues, db: AppDatabase = this.db) {
    const [row] = await db
      .insert(schema.candidates)
      .values({ ...values, email: this.normalizeEmail(values.email) })
      .returning();
    return row ?? null;
  }

  async findPostingById(id: string, db: AppDatabase = this.db) {
    const row = await db.query.jobPostings.findFirst({
      where: eq(schema.jobPostings.id, id),
    });
    return row ?? null;
  }

  /**
   * Returns an existing application for the candidate+posting that is NOT in a
   * terminal stage (rejected/withdrawn), i.e. an application still in flight.
   */
  async findActiveApplication(
    candidateId: string,
    postingId: string,
    db: AppDatabase = this.db,
  ) {
    const row = await db.query.applications.findFirst({
      where: and(
        eq(schema.applications.candidateId, candidateId),
        eq(schema.applications.postingId, postingId),
        // active = current stage is not a terminal stage
        ne(schema.applications.currentStage, "rejected"),
        ne(schema.applications.currentStage, "withdrawn"),
      ),
    });
    return row ?? null;
  }

  async createApplication(
    values: ApplicationValues,
    db: AppDatabase = this.db,
  ) {
    const [row] = await db
      .insert(schema.applications)
      .values(values)
      .returning();
    return row ?? null;
  }

  /**
   * Hydrated fetch: application with candidate, posting, stage events (ordered
   * by createdAt asc) and scorecards.
   */
  async findApplicationById(id: string, db: AppDatabase = this.db) {
    const row = await db.query.applications.findFirst({
      where: eq(schema.applications.id, id),
      with: {
        candidate: true,
        posting: true,
        stageEvents: {
          orderBy: [asc(schema.applicationStageEvents.createdAt)],
        },
        scorecards: true,
      },
    });
    return row ?? null;
  }

  async updateApplicationStage(
    id: string,
    currentStage: ApplicationStage,
    db: AppDatabase = this.db,
  ) {
    const [row] = await db
      .update(schema.applications)
      .set({ currentStage, updatedAt: new Date() })
      .where(eq(schema.applications.id, id))
      .returning();
    return row ?? null;
  }

  async updateApplicationCvFile(
    id: string,
    cvFileId: string,
    db: AppDatabase = this.db,
  ) {
    const [row] = await db
      .update(schema.applications)
      .set({ cvFileId, updatedAt: new Date() })
      .where(eq(schema.applications.id, id))
      .returning();
    return row ?? null;
  }

  async appendStageEvent(
    values: ApplicationStageEventValues,
    db: AppDatabase = this.db,
  ) {
    const [row] = await db
      .insert(schema.applicationStageEvents)
      .values(values)
      .returning();
    return row ?? null;
  }

  async createScorecard(
    values: InterviewScorecardValues,
    db: AppDatabase = this.db,
  ) {
    const [row] = await db
      .insert(schema.interviewScorecards)
      .values(values)
      .returning();
    return row ?? null;
  }

  async findScorecardsByApplication(
    applicationId: string,
    db: AppDatabase = this.db,
  ) {
    return db.query.interviewScorecards.findMany({
      where: eq(schema.interviewScorecards.applicationId, applicationId),
      orderBy: [asc(schema.interviewScorecards.createdAt)],
    });
  }

  async list(query: CandidateQueryDto) {
    const { page = 1, limit = 20, postingId } = query;
    const offset = (page - 1) * limit;
    const conditions = [];

    if (postingId) {
      conditions.push(eq(schema.applications.postingId, postingId));
    }

    const where =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    const rows = await this.db.query.applications.findMany({
      where,
      with: {
        candidate: true,
      },
      orderBy: [desc(schema.applications.createdAt)],
      limit,
      offset,
    });

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(schema.applications)
      .where(where);

    return {
      rows,
      total: Number(totalResult?.value ?? 0),
      page,
      limit,
    };
  }

  // Referenced to keep the terminal-stage import available for consumers that
  // filter on it via inArray without re-declaring the list.
  static isTerminalStage(stage: ApplicationStage): boolean {
    return (TERMINAL_STAGES as readonly string[]).includes(stage);
  }
}
