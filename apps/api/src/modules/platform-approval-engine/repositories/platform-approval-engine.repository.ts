import {  Inject , Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../infrastructure/database/database-client.type";
import {
  approvalPolicies,
  approvalRequests,
  approvalSteps,
} from "../../../infrastructure/database/schema";

@Injectable()
export class PlatformApprovalEngineRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  findPolicyById(policyId: string) {
    return this.db.query.approvalPolicies.findFirst({
      where: eq(approvalPolicies.id, policyId),
    });
  }

  findActivePolicyByKey(key: string) {
    return this.db.query.approvalPolicies.findFirst({
      where: (t, { and, eq }) =>
        and(eq(t.key, key), eq(t.isActive, true)),
      orderBy: (t, { desc }) => [desc(t.version)],
    });
  }

  async insertPolicy(input: {
    key: string;
    version: number;
    name: string | null;
    description: string | null;
    steps: Record<string, unknown>;
  }) {
    const [row] = await this.db
      .insert(approvalPolicies)
      .values({
        key: input.key,
        version: input.version,
        name: input.name,
        description: input.description,
        steps: input.steps,
      })
      .returning();
    return row ?? null;
  }

  async insertRequest(input: {
    policyId: string;
    subjectType: string;
    subjectId: string;
    requestedByUserId: string | null;
    metadata: Record<string, unknown> | null;
  }) {
    const [request] = await this.db
      .insert(approvalRequests)
      .values({
        policyId: input.policyId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        requestedByUserId: input.requestedByUserId,
        metadata: input.metadata,
      })
      .returning();
    return request ?? null;
  }

  findRequestById(requestId: string) {
    return this.db.query.approvalRequests.findFirst({
      where: eq(approvalRequests.id, requestId),
    });
  }

  findStep(requestId: string, stepIndex: number) {
    return this.db.query.approvalSteps.findFirst({
      where: (t, { and, eq }) => and(eq(t.requestId, requestId), eq(t.stepIndex, stepIndex)),
    });
  }

  insertSteps(rows: {
    requestId: string;
    stepIndex: number;
    status: string;
    approverUserId: string | null;
    payload: unknown;
  }[]) {
    return this.db.insert(approvalSteps).values(rows as (typeof approvalSteps.$inferInsert)[]);
  }

  updateStep(stepId: string, patch: Record<string, unknown>) {
    return this.db.update(approvalSteps).set(patch).where(eq(approvalSteps.id, stepId));
  }

  async anyPendingStep(requestId: string) {
    const row = await this.db.query.approvalSteps.findFirst({
      where: (t, { and, eq }) => and(eq(t.requestId, requestId), eq(t.status, "pending")),
      columns: { id: true },
    });
    return Boolean(row);
  }

  updateRequest(requestId: string, patch: Record<string, unknown>) {
    return this.db.update(approvalRequests).set(patch).where(eq(approvalRequests.id, requestId));
  }

  findRequestBySubject(subjectType: string, subjectId: string) {
    return this.db.query.approvalRequests.findFirst({
      where: (t, { and, eq }) =>
        and(eq(t.subjectType, subjectType), eq(t.subjectId, subjectId)),
    });
  }

  findPendingStepByApprover(requestId: string, userId: string) {
    return this.db.query.approvalSteps.findFirst({
      where: (t, { and, eq }) =>
        and(
          eq(t.requestId, requestId),
          eq(t.status, "pending"),
          eq(t.approverUserId, userId),
        ),
    });
  }

  // ─── New methods for list/paginate operations ───────────────────────

  listPolicies(opts: {
    key?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const conditions: any[] = [];
    if (opts.key) conditions.push(eq(approvalPolicies.key, opts.key));
    if (opts.isActive !== undefined) conditions.push(eq(approvalPolicies.isActive, opts.isActive));

    return this.db.query.approvalPolicies.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit: opts.limit,
      offset: opts.offset,
      orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
    });
  }

  countPolicies(opts: { key?: string; isActive?: boolean }) {
    const conditions: any[] = [];
    if (opts.key) conditions.push(eq(approvalPolicies.key, opts.key));
    if (opts.isActive !== undefined) conditions.push(eq(approvalPolicies.isActive, opts.isActive));

    return this.db.$count(approvalPolicies, conditions.length > 0 ? and(...conditions) : undefined);
  }

  async updatePolicy(id: string, data: { name?: string; description?: string; steps?: Record<string, unknown> }) {
    const [updated] = await this.db
      .update(approvalPolicies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(approvalPolicies.id, id))
      .returning();
    return updated ?? null;
  }

  async deactivatePolicy(id: string) {
    const [updated] = await this.db
      .update(approvalPolicies)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(approvalPolicies.id, id))
      .returning();
    return updated ?? null;
  }

  listRequests(opts: {
    status?: string;
    policyId?: string;
    subjectType?: string;
    subjectId?: string;
    requestedByUserId?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions: any[] = [];
    if (opts.status) conditions.push(eq(approvalRequests.status, opts.status as any));
    if (opts.policyId) conditions.push(eq(approvalRequests.policyId, opts.policyId));
    if (opts.subjectType) conditions.push(eq(approvalRequests.subjectType, opts.subjectType));
    if (opts.subjectId) conditions.push(eq(approvalRequests.subjectId, opts.subjectId));
    if (opts.requestedByUserId) conditions.push(eq(approvalRequests.requestedByUserId, opts.requestedByUserId));

    return this.db.query.approvalRequests.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit: opts.limit,
      offset: opts.offset,
      orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
    });
  }

  countRequests(opts: {
    status?: string;
    policyId?: string;
    subjectType?: string;
    subjectId?: string;
    requestedByUserId?: string;
  }) {
    const conditions: any[] = [];
    if (opts.status) conditions.push(eq(approvalRequests.status, opts.status as any));
    if (opts.policyId) conditions.push(eq(approvalRequests.policyId, opts.policyId));
    if (opts.subjectType) conditions.push(eq(approvalRequests.subjectType, opts.subjectType));
    if (opts.subjectId) conditions.push(eq(approvalRequests.subjectId, opts.subjectId));
    if (opts.requestedByUserId) conditions.push(eq(approvalRequests.requestedByUserId, opts.requestedByUserId));

    return this.db.$count(approvalRequests, conditions.length > 0 ? and(...conditions) : undefined);
  }

  findRequestWithSteps(requestId: string) {
    return this.db.query.approvalRequests.findFirst({
      where: eq(approvalRequests.id, requestId),
      with: { steps: { orderBy: (t: any, { asc }: any) => [asc(t.stepIndex)] } },
    });
  }

  listPendingStepsByApprover(userId: string, opts: { limit?: number; offset?: number }) {
    return this.db.query.approvalSteps.findMany({
      where: and(eq(approvalSteps.status, "pending"), eq(approvalSteps.approverUserId, userId)),
      limit: opts.limit,
      offset: opts.offset,
      orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
      with: { request: true },
    });
  }

  countPendingStepsByApprover(userId: string) {
    return this.db.$count(
      approvalSteps,
      and(eq(approvalSteps.status, "pending"), eq(approvalSteps.approverUserId, userId)),
    );
  }

  // ─── Transaction support ────────────────────────────────────────────

  async transaction<T>(fn: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }
}

