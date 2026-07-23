import type { Tx } from "./employee-repository.types";
import {
  employees,
  employmentRecords,
  orgAssignments,
  users,
} from "../../../../infrastructure/database/schema";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { type EmployeeEncryption } from "./employee-encryption";
import crypto from "crypto";

export class EmployeeWriteRepository {
  constructor(
    protected readonly db: Tx,
    private readonly encryption: EmployeeEncryption,
  ) {}

  transaction<T>(fn: (tx: Tx) => Promise<T>) {
    return this.db.transaction(fn);
  }

  async create(
    data: typeof employees.$inferInsert,
  ): Promise<typeof employees.$inferSelect> {
    const [row] = await this.db
      .insert(employees)
      .values(data)
      .returning();
    if (!row) throw new Error("failed_to_create_employee");
    return row;
  }

  /** Sensitive fields that trigger audit trail on change */
  private static readonly AUDIT_SENSITIVE_FIELDS = [
    "identityNumber",
    "bankAccountNumber",
    "taxCode",
    "emergencyContactName",
    "emergencyContactPhone",
  ] as const;

  async update(
    id: string,
    data: Partial<typeof employees.$inferInsert> & { expectedVersion?: number },
  ): Promise<typeof employees.$inferSelect> {
    // 1. Snapshot old values before mutation
    const [before] = await this.db
      .select()
      .from(employees)
      .where(eq(employees.id, id))
      .limit(1);

    const encrypted = this.encryption
      ? this.encryption.encryptPiiFields(data)
      : data;
    const { expectedVersion, ...cleanData } = data as any;
    const whereCondition =
      expectedVersion !== undefined
        ? and(eq(employees.id, id), eq(employees.version, expectedVersion))
        : eq(employees.id, id);
    const [row] = await this.db
      .update(employees)
      .set({ ...cleanData, updatedAt: new Date(), version: sql`${employees.version} + 1` })
      .where(whereCondition)
      .returning();
    if (!row) {
      if (expectedVersion !== undefined) {
        throw new Error("conflict");
      }
      throw new Error("employee_not_found");
    }

    // 2. Write audit entry for each changed sensitive field (best-effort, no throw)
    if (before) {
      this.writeSensitiveAudit(id, before, cleanData);
    }

    return row;
  }

  private writeSensitiveAudit(
    employeeId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): void {
    try {
      for (const field of EmployeeWriteRepository.AUDIT_SENSITIVE_FIELDS) {
        const oldVal = String(before[field] ?? "");
        const newVal = String(after[field] ?? "");
        if (oldVal !== newVal && (oldVal || newVal)) {
          const oldHash = crypto.createHash("sha256").update(oldVal).digest("hex");
          const newHash = crypto.createHash("sha256").update(newVal).digest("hex");
          this.db.execute(
            sql`INSERT INTO audit_logs (action, entity, entity_id, metadata)
                VALUES ('employee_sensitive_update', 'employee', ${employeeId},
                        ${JSON.stringify({ field, oldHash, newHash })})`,
          ).catch(() => {});
        }
      }
    } catch {
      // Audit failure must never fail the business operation
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(employees).where(eq(employees.id, id));
  }

  async restoreEmployee(employeeId: string, tx: Tx) {
    await tx
      .update(employees)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(employees.id, employeeId), isNotNull(employees.deletedAt)),
      );

    await tx
      .update(employmentRecords)
      .set({ updatedAt: new Date() })
      .where(
        and(
          eq(employmentRecords.employeeId, employeeId),
          eq(employmentRecords.isCurrent, true),
        ),
      );
  }

  async hardDeleteEmployee(employeeId: string, tx: Tx) {
    await tx.delete(employees).where(eq(employees.id, employeeId));
  }

  updateUserById(
    userId: string,
    values: Partial<typeof users.$inferInsert>,
    tx: Tx,
  ) {
    return tx
      .update(users)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()
      .then((r) => r[0] ?? null);
  }

  setPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    tx: Tx,
  ) {
    return this.updateUserById(
      userId,
      {
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpiresAt: expiresAt,
        mustChangePassword: true,
      },
      tx,
    );
  }

  insertEmployee(values: typeof employees.$inferInsert, tx: Tx) {
    const encrypted = this.encryption
      ? this.encryption.encryptPiiFields(values)
      : values;
    return tx
      .insert(employees)
      .values(encrypted as typeof employees.$inferInsert)
      .returning()
      .then((r) => r[0] ?? null);
  }

  insertEmploymentRecord(
    values: typeof employmentRecords.$inferInsert,
    tx: Tx,
  ) {
    return tx
      .insert(employmentRecords)
      .values(values)
      .returning()
      .then((r) => r[0] ?? null);
  }

  insertOrgAssignment(values: typeof orgAssignments.$inferInsert, tx: Tx) {
    return tx
      .insert(orgAssignments)
      .values(values)
      .returning()
      .then((r) => r[0] ?? null);
  }

  updateEmploymentRecordById(id: string, values: any, tx: Tx) {
    return tx
      .update(employmentRecords)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(employmentRecords.id, id))
      .returning()
      .then((r) => r[0] ?? null);
  }

  updateOrgAssignmentById(id: string, values: any, tx: Tx) {
    return tx
      .update(orgAssignments)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(orgAssignments.id, id))
      .returning()
      .then((r) => r[0] ?? null);
  }

  deleteEmployee(employeeId: string, tx: Tx) {
    return tx.delete(employees).where(eq(employees.id, employeeId));
  }

  softDeleteEmployee(employeeId: string, tx: Tx) {
    return tx
      .update(employees)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(employees.id, employeeId), isNull(employees.deletedAt)),
      );
  }

  deleteUser(userId: string, tx: Tx) {
    return tx.delete(users).where(eq(users.id, userId));
  }

  async replaceEmployeeAvatar(
    employeeId: string,
    fileId: string | null,
    tx?: Tx,
  ) {
    const db = tx ?? this.db;
    return db
      .update(employees)
      .set({
        avatarFileId: fileId,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, employeeId));
  }

  bindEmployeeAvatar(employeeId: string, fileId: string, tx?: Tx) {
    return this.replaceEmployeeAvatar(employeeId, fileId, tx);
  }

  updateEmployee(whereClause: any, values: any, tx: Tx) {
    return tx
      .update(employees)
      .set(values)
      .where(whereClause)
      .returning()
      .then((r) => r[0] ?? null);
  }

  updateEmployeeById(employeeId: string, values: any, tx: Tx) {
    const encrypted = this.encryption
      ? this.encryption.encryptPiiFields(values as Record<string, unknown>)
      : values;
    return this.updateEmployee(eq(employees.id, employeeId), encrypted, tx);
  }
}

