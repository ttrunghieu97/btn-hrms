import { Injectable } from "@nestjs/common";
import { eq, desc, and, count } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";

export type EnrollRow = typeof schema.benefitEnrollments.$inferSelect;
export type EnrollInsert = typeof schema.benefitEnrollments.$inferInsert;
export type EnrollUpdate = Partial<EnrollInsert>;

@Injectable()
export class BenefitEnrollmentRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();
  constructor(private readonly scopedDb: ScopedDbService) {}

  async insert(v: EnrollInsert): Promise<EnrollRow> {
    const [r] = await this.db.insert(schema.benefitEnrollments).values(v).returning(); return r!;
  }
  async findById(id: string): Promise<EnrollRow | null> {
    const r = await this.db.query.benefitEnrollments.findFirst({ where: eq(schema.benefitEnrollments.id, id) }); return r ?? null;
  }
  async findByEmployee(employeeId: string): Promise<EnrollRow[]> {
    return this.db.query.benefitEnrollments.findMany({ where: eq(schema.benefitEnrollments.employeeId, employeeId) });
  }
  async update(id: string, v: EnrollUpdate): Promise<EnrollRow | null> {
    const [r] = await this.db.update(schema.benefitEnrollments).set({ ...v, updatedAt: new Date() }).where(eq(schema.benefitEnrollments.id, id)).returning(); return r ?? null;
  }
  async insertDependent(v: typeof schema.benefitDependents.$inferInsert): Promise<void> {
    await this.db.insert(schema.benefitDependents).values(v);
  }
}
