import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import {
  certifications,
} from "../../../../infrastructure/database/schema";

type CertificationInput = Omit<
  typeof certifications.$inferInsert,
  "employeeId" | "createdAt" | "updatedAt"
>;

@Injectable()
export class EmployeeCertificationRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: AppDatabase,
  ) {}

  insertCertifications(
    employeeId: string,
    certs: CertificationInput[],
    tx: AppDatabase = this.db,
  ) {
    if (!certs.length) return Promise.resolve();
    return tx.insert(certifications).values(
      certs.map((cert) => ({
        ...cert,
        employeeId,
      })),
    );
  }

  deleteCertifications(employeeId: string, tx: AppDatabase = this.db) {
    return tx
      .delete(certifications)
      .where(eq(certifications.employeeId, employeeId));
  }

  async replaceEmployeeCertifications(
    employeeId: string,
    certs: CertificationInput[],
    tx: AppDatabase,
  ) {
    await this.deleteCertifications(employeeId, tx);
    if (!certs.length) return;
    await this.insertCertifications(employeeId, certs, tx);
  }

  async updateCertificationAttachment(
    certificationId: string,
    fileId: string | null,
    tx: AppDatabase = this.db,
  ) {
    return tx
      .update(certifications)
      .set({ fileId, updatedAt: new Date() })
      .where(eq(certifications.id, certificationId));
  }

  async updateCertificationAttachmentForEmployee(
    employeeId: string,
    certificationId: string,
    fileId: string | null,
  ) {
    const [updated] = await this.db
      .update(certifications)
      .set({ fileId, updatedAt: new Date() })
      .where(
        and(
          eq(certifications.id, certificationId),
          eq(certifications.employeeId, employeeId),
        ),
      )
      .returning({ id: certifications.id });
    return updated ?? null;
  }
}


