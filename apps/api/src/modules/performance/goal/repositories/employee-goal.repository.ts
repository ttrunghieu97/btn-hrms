import { Injectable } from "@nestjs/common";
import { count, eq, and } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";

export type GoalRow = typeof schema.goals.$inferSelect;
export type GoalInsert = typeof schema.goals.$inferInsert;
export type GoalUpdate = Partial<GoalInsert>;
export type GoalAssignmentRow = typeof schema.goalAssignments.$inferSelect;
export type GoalAssignmentInsert = typeof schema.goalAssignments.$inferInsert;
export type KeyResultRow = typeof schema.goalKeyResults.$inferSelect;
export type KeyResultInsert = typeof schema.goalKeyResults.$inferInsert;

@Injectable()
export class EmployeeGoalRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();

  constructor(private readonly scopedDb: ScopedDbService) {}

  async insertGoal(values: GoalInsert): Promise<GoalRow> {
    const [row] = await this.db.insert(schema.goals).values(values).returning();
    return row!;
  }

  async findGoalById(id: string): Promise<GoalRow | null> {
    const row = await this.db.query.goals.findFirst({
      where: eq(schema.goals.id, id),
    });
    return row ?? null;
  }

  async findGoalsByCycle(cycleId: string): Promise<GoalRow[]> {
    return this.db.query.goals.findMany({
      where: eq(schema.goals.cycleId, cycleId),
    });
  }

  async updateGoal(id: string, values: GoalUpdate): Promise<GoalRow | null> {
    const [row] = await this.db
      .update(schema.goals)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.goals.id, id))
      .returning();
    return row ?? null;
  }

  async insertAssignment(values: GoalAssignmentInsert): Promise<GoalAssignmentRow> {
    const [row] = await this.db.insert(schema.goalAssignments).values(values).returning();
    return row!;
  }

  async findAssignmentsByGoal(goalId: string): Promise<GoalAssignmentRow[]> {
    return this.db.query.goalAssignments.findMany({
      where: eq(schema.goalAssignments.goalId, goalId),
    });
  }


  async countGoalsByCycle(cycleId: string): Promise<number> {
    const [result] = await this.db
      .select({ value: count() })
      .from(schema.goals)
      .where(eq(schema.goals.cycleId, cycleId));
    return Number(result?.value ?? 0);
  }

  async insertKeyResult(values: KeyResultInsert): Promise<KeyResultRow> {
    const [row] = await this.db.insert(schema.goalKeyResults).values(values).returning();
    return row!;
  }
}
