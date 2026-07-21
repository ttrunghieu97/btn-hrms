import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import {
  employeeDocuments,
} from "../../../../infrastructure/database/schema";

type EmployeeDocumentInput = Pick<
  typeof employeeDocuments.$inferInsert,
  "fileId" | "documentType"
>;
export type EmployeeDocumentRow = typeof employeeDocuments.$inferSelect;

@Injectable()
export class EmployeeDocumentRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: AppDatabase,
  ) {}

  insertDocuments(
    employeeId: string,
    docs: EmployeeDocumentInput[],
    tx: AppDatabase = this.db,
  ) {
    if (!docs.length) return Promise.resolve();
    return tx.insert(employeeDocuments).values(
      docs.map((doc) => ({
        ...doc,
        employeeId,
      })),
    );
  }

  deleteDocuments(employeeId: string, tx: AppDatabase = this.db) {
    return tx
      .delete(employeeDocuments)
      .where(eq(employeeDocuments.employeeId, employeeId));
  }

  findDocumentsByEmployeeId(employeeId: string) {
    return this.db
      .select()
      .from(employeeDocuments)
      .where(eq(employeeDocuments.employeeId, employeeId));
  }

  async insertEmployeeDocument(
    employeeId: string,
    doc: { documentType: string; fileId: string },
  ) {
    const [row] = await this.db
      .insert(employeeDocuments)
      .values({
        employeeId,
        documentType: doc.documentType,
        fileId: doc.fileId,
        isActive: true,
      })
      .returning();
    if (!row) throw new Error("failed_to_create_employee_document");
    return row;
  }

  insertEmployeeDocumentInTx(
    employeeId: string,
    doc: EmployeeDocumentInput,
    tx: AppDatabase,
  ) {
    return tx
      .insert(employeeDocuments)
      .values({
        employeeId,
        documentType: doc.documentType,
        fileId: doc.fileId,
        isActive: true,
      })
      .returning()
      .then((rows) => rows[0] ?? null);
  }

  async replaceEmployeeDocuments(
    employeeId: string,
    docs: EmployeeDocumentInput[],
    tx: AppDatabase,
  ) {
    await tx
      .update(employeeDocuments)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(employeeDocuments.employeeId, employeeId),
          eq(employeeDocuments.isActive, true),
        ),
      );

    if (!docs.length) return;

    await tx.insert(employeeDocuments).values(
      docs.map((doc) => ({
        employeeId,
        fileId: doc.fileId,
        documentType: doc.documentType,
        isActive: true,
      })),
    );
  }

  async deleteEmployeeDocumentById(employeeId: string, documentId: string) {
    const [row] = await this.db
      .delete(employeeDocuments)
      .where(
        and(
          eq(employeeDocuments.employeeId, employeeId),
          eq(employeeDocuments.id, documentId),
        ),
      )
      .returning({ id: employeeDocuments.id });
    return row ?? null;
  }
}


