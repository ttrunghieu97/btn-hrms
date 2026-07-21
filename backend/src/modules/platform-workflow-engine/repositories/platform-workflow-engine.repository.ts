import {  Inject , Injectable } from "@nestjs/common";
import { and, desc, eq, asc, count } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../infrastructure/database/database-client.type";
import {
  workflowDefinitions,
  workflowInstances,
  workflowInstanceTransitions,
} from "../../../infrastructure/database/schema";

@Injectable()
export class PlatformWorkflowEngineRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  async upsertDefinition(input: {
    key: string;
    version: number;
    name: string;
    initialState: string;
    states: Record<string, unknown>;
    transitions: Record<string, unknown>;
  }) {
    const existing = await this.db.query.workflowDefinitions.findFirst({
      where: (t, { and, eq }) => and(eq(t.key, input.key), eq(t.version, input.version)),
    });

    if (!existing) {
      const [created] = await this.db
        .insert(workflowDefinitions)
        .values({
          key: input.key,
          version: input.version,
          name: input.name,
          initialState: input.initialState,
          states: input.states,
          transitions: input.transitions,
          isActive: true,
        })
        .returning();
      return created ?? null;
    }

    const [updated] = await this.db
      .update(workflowDefinitions)
      .set({
        name: input.name,
        initialState: input.initialState,
        states: input.states,
        transitions: input.transitions,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(workflowDefinitions.id, existing.id))
      .returning();

    return updated ?? existing;
  }

  getActiveDefinition(key: string) {
    return this.db.query.workflowDefinitions.findFirst({
      where: (t, { and, eq }) => and(eq(t.key, key), eq(t.isActive, true)),
      orderBy: (t) => [desc(t.version)],
    });
  }

  findActiveInstanceBySubject(input: {
    definitionId: string;
    subjectType: string;
    subjectId: string;
  }) {
    return this.db.query.workflowInstances.findFirst({
      where: and(
        eq(workflowInstances.definitionId, input.definitionId),
        eq(workflowInstances.subjectType, input.subjectType),
        eq(workflowInstances.subjectId, input.subjectId),
        eq(workflowInstances.status, "active"),
      ),
    });
  }

  async createInstance(input: {
    definitionId: string;
    subjectType: string;
    subjectId: string;
    currentState: string;
    metadata: Record<string, unknown> | null;
  }) {
    const [row] = await this.db
      .insert(workflowInstances)
      .values({
        definitionId: input.definitionId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        currentState: input.currentState,
        status: "active",
        startedAt: new Date(),
        metadata: input.metadata,
      })
      .returning();
    if (!row) throw new Error("workflow_instance_create_failed");
    return row;
  }

  async findDueScheduledInstances(
    definitionId: string,
    beforeDate: string,
    limit = 50,
  ) {
    const db = this.db as any;
    const instances = await db.query.workflowInstances.findMany({
      where: (wi: any, { eq, and, lte }: any) =>
        and(
          eq(wi.definitionId, definitionId),
          eq(wi.status, "active"),
          lte(wi.metadata.effectiveDate, beforeDate),
        ),
      limit,
    });
    return instances ?? [];
  }

  async getInstance(instanceId: string) {
    return this.db.query.workflowInstances.findFirst({
      where: eq(workflowInstances.id, instanceId),
    });
  }

  async updateInstance(
    instanceId: string,
    values: Record<string, unknown>,
  ) {
    return this.db
      .update(workflowInstances)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(workflowInstances.id, instanceId));
  }

  listDefinitions(opts?: { limit?: number; offset?: number }) {
    return this.db.query.workflowDefinitions.findMany({
      limit: opts?.limit,
      offset: opts?.offset,
      orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
    });
  }

  countDefinitions() {
    return this.db.select({ count: count() }).from(workflowDefinitions);
  }

  listInstances(opts: {
    status?: string;
    definitionId?: string;
    subjectType?: string;
    subjectId?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions: any[] = [];
    if (opts.status) conditions.push(eq(workflowInstances.status, opts.status as any));
    if (opts.definitionId) conditions.push(eq(workflowInstances.definitionId, opts.definitionId));
    if (opts.subjectType) conditions.push(eq(workflowInstances.subjectType, opts.subjectType));
    if (opts.subjectId) conditions.push(eq(workflowInstances.subjectId, opts.subjectId));

    return this.db.query.workflowInstances.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit: opts.limit,
      offset: opts.offset,
      orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
    });
  }

  countInstances(opts: {
    status?: string;
    definitionId?: string;
    subjectType?: string;
    subjectId?: string;
  }) {
    const conditions: any[] = [];
    if (opts.status) conditions.push(eq(workflowInstances.status, opts.status as any));
    if (opts.definitionId) conditions.push(eq(workflowInstances.definitionId, opts.definitionId));
    if (opts.subjectType) conditions.push(eq(workflowInstances.subjectType, opts.subjectType));
    if (opts.subjectId) conditions.push(eq(workflowInstances.subjectId, opts.subjectId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    return this.db.$count(workflowInstances, where);
  }

  listTransitionsByInstanceId(instanceId: string) {
    return this.db.query.workflowInstanceTransitions.findMany({
      where: eq(workflowInstanceTransitions.instanceId, instanceId),
      orderBy: (t: any, { asc }: any) => [asc(t.occurredAt)],
    });
  }

  findDefinitionByKey(key: string) {
    return this.db.query.workflowDefinitions.findFirst({
      where: (t: any, { and, eq }: any) => and(eq(t.key, key)),
    });
  }

  async recordTransition(input: {
    instanceId: string;
    fromState: string | null;
    toState: string;
    transition: string;
    actorUserId: string | null;
    payload: Record<string, unknown> | null;
  }) {
    const [row] = await this.db
      .insert(workflowInstanceTransitions)
      .values({
        instanceId: input.instanceId,
        fromState: input.fromState,
        toState: input.toState,
        transition: input.transition,
        actorUserId: input.actorUserId,
        payload: input.payload,
      })
      .returning();
    return row ?? null;
  }
}

