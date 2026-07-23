import { Injectable } from "@nestjs/common";
import { eq, desc, and } from "drizzle-orm";
import * as schema from "../../../../infrastructure/database/schema";
import { ScopedDbService } from "../../../../infrastructure/database/scoped-db.service";

export type DefRow = typeof schema.certificationDefinitions.$inferSelect;
export type DefInsert = typeof schema.certificationDefinitions.$inferInsert;
export type CertRow = typeof schema.employeeCertifications.$inferSelect;
export type CertInsert = typeof schema.employeeCertifications.$inferInsert;
export type CertUpdate = Partial<CertInsert>;

@Injectable()
export class CertificationRepository {
  private readonly db = this.scopedDb.getDb<typeof schema>();
  constructor(private readonly scopedDb: ScopedDbService) {}

  async insertDef(v: DefInsert): Promise<DefRow> {
    const [r] = await this.db.insert(schema.certificationDefinitions).values(v).returning(); return r!;
  }
  async findDefById(id: string): Promise<DefRow | null> {
    const r = await this.db.query.certificationDefinitions.findFirst({ where: eq(schema.certificationDefinitions.id, id) }); return r ?? null;
  }
  async findDefs(): Promise<DefRow[]> {
    return this.db.query.certificationDefinitions.findMany({ orderBy: desc(schema.certificationDefinitions.createdAt) });
  }
  async insertCert(v: CertInsert): Promise<CertRow> {
    const [r] = await this.db.insert(schema.employeeCertifications).values(v).returning(); return r!;
  }
  async findCertById(id: string): Promise<CertRow | null> {
    const r = await this.db.query.employeeCertifications.findFirst({ where: eq(schema.employeeCertifications.id, id) }); return r ?? null;
  }
  async findCertsByEmployee(employeeId: string): Promise<CertRow[]> {
    return this.db.query.employeeCertifications.findMany({ where: eq(schema.employeeCertifications.employeeId, employeeId) });
  }
  async updateCert(id: string, v: CertUpdate): Promise<void> {
    await this.db.update(schema.employeeCertifications).set({ ...v, updatedAt: new Date() }).where(eq(schema.employeeCertifications.id, id));
  }
}
