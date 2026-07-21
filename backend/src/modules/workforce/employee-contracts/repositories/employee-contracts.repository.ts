import { Inject, Injectable } from "@nestjs/common";
import { todayDateString } from "../../../../shared/utils/date-format";
import { and, eq, desc, isNull } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import {
  employeeContracts,
  employees,
  employmentRecords,
} from "../../../../infrastructure/database/schema";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { type EmployeeWithRelations } from "../../employees/repositories/employees.repository";

export type EmploymentRecordValues = Partial<
  typeof employmentRecords.$inferInsert
>;
export type EmployeeContractValues = Partial<
  typeof employeeContracts.$inferInsert
>;


@Injectable()
export class EmployeeContractsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: AppDatabase,
  ) {}

  async transaction<T>(fn: (tx: AppDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }

  async findEmployeeContractSnapshot(
    employeeId: string,
    db: AppDatabase = this.db,
  ): Promise<EmployeeWithRelations | null> {
    return (await db.query.employees.findFirst({
      where: and(eq(employees.id, employeeId), isNull(employees.deletedAt)),
      with: {
        employmentRecords: true,
        contracts: true,
      },
    })) ?? null;
  }

  async getCurrent(employeeId: string, tx: AppDatabase = this.db) {
    const result = await tx
      .select()
      .from(employeeContracts)
      .where(
        and(
          eq(employeeContracts.employeeId, employeeId),
          eq(employeeContracts.isCurrent, true),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async getHistory(employeeId: string, tx: AppDatabase = this.db) {
    return tx
      .select()
      .from(employeeContracts)
      .where(eq(employeeContracts.employeeId, employeeId))
      .orderBy(desc(employeeContracts.effectiveFrom));
  }

  async create(
    data: typeof employeeContracts.$inferInsert,
    tx: AppDatabase,
  ) {
    await tx
      .update(employeeContracts)
      .set({ isCurrent: false, updatedAt: new Date() })
      .where(
        and(
          eq(employeeContracts.employeeId, data.employeeId),
          eq(employeeContracts.isCurrent, true),
        ),
      );

    const [row] = await tx
      .insert(employeeContracts)
      .values({ ...data, isCurrent: true })
      .returning();
    return row ?? null;
  }

  async update(
    contractId: string,
    data: Partial<typeof employeeContracts.$inferInsert>,
    tx: AppDatabase = this.db,
  ) {
    const [row] = await tx
      .update(employeeContracts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(employeeContracts.id, contractId))
      .returning();
    return row ?? null;
  }

  async amend(
    employeeId: string,
    data: Partial<typeof employeeContracts.$inferInsert>,
    tx: AppDatabase,
  ) {
    const current = await tx
      .select()
      .from(employeeContracts)
      .where(
        and(
          eq(employeeContracts.employeeId, employeeId),
          eq(employeeContracts.isCurrent, true),
        ),
      )
      .limit(1);

    const prevVersion = current[0]?.version ?? 0;

    if (current[0]) {
      await tx
        .update(employeeContracts)
        .set({ isCurrent: false, status: "superseded", updatedAt: new Date() })
        .where(eq(employeeContracts.id, current[0].id));
    }

    const [row] = await tx
      .insert(employeeContracts)
      .values({
        employeeId,
        contractNumber: data.contractNumber,
        contractType: data.contractType ?? current[0]?.contractType ?? "permanent",
        status: "active",
        version: prevVersion + 1,
        previousContractId: current[0]?.id ?? null,
        isCurrent: true,
        effectiveFrom: data.effectiveFrom ?? current[0]?.effectiveFrom ?? todayDateString(),
        effectiveTo: data.effectiveTo,
        signedAt: data.signedAt,
        fileUrl: data.fileUrl,
        note: data.note,
        employmentRecordId: data.employmentRecordId,
      })
      .returning();
    return row ?? null;
  }

  async updateMetadata(
    contractId: string,
    data: { note?: string | null; fileUrl?: string | null; signedAt?: string | null },
    tx: AppDatabase = this.db,
  ) {
    const [row] = await tx
      .update(employeeContracts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(employeeContracts.id, contractId))
      .returning();
    return row ?? null;
  }

  async upsertCurrentEmploymentRecord(
    employeeId: string,
    values: EmploymentRecordValues,
    tx: AppDatabase,
  ) {
    const current = await tx.query.employmentRecords.findFirst({
      where: and(
        eq(employmentRecords.employeeId, employeeId),
        eq(employmentRecords.isCurrent, true),
      ),
    });

    if (current) {
      const [row] = await tx
        .update(employmentRecords)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(employmentRecords.id, current.id))
        .returning();
      return row ?? null;
    }

    const insertValues: typeof employmentRecords.$inferInsert = {
      employeeId,
      startDate: values.startDate ?? todayDateString(),
      isCurrent: true,
      ...(values.endDate !== undefined ? { endDate: values.endDate } : {}),
      ...(values.managerEmployeeId !== undefined
        ? { managerEmployeeId: values.managerEmployeeId }
        : {}),
      ...(values.note !== undefined ? { note: values.note } : {}),
    };

    const [row] = await tx
      .insert(employmentRecords)
      .values(insertValues)
      .returning();
    return row ?? null;
  }

  async upsertCurrentEmployeeContract(
    employeeId: string,
    values: EmployeeContractValues,
    tx: AppDatabase,
  ) {
    const current = await tx.query.employeeContracts.findFirst({
      where: and(
        eq(employeeContracts.employeeId, employeeId),
        eq(employeeContracts.isCurrent, true),
      ),
    });

    if (current) {
      const [row] = await tx
        .update(employeeContracts)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(employeeContracts.id, current.id))
        .returning();
      return row ?? null;
    }

    const insertValues: typeof employeeContracts.$inferInsert = {
      employeeId,
      version: 1,
      isCurrent: true,
      effectiveFrom: values.effectiveFrom ?? todayDateString(),
      ...(values.employmentRecordId !== undefined
        ? { employmentRecordId: values.employmentRecordId }
        : {}),
      ...(values.contractNumber !== undefined
        ? { contractNumber: values.contractNumber }
        : {}),
      ...(values.contractType !== undefined
        ? { contractType: values.contractType }
        : {}),
      ...(values.status !== undefined ? { status: values.status } : {}),
      ...(values.signedAt !== undefined ? { signedAt: values.signedAt } : {}),
      ...(values.effectiveTo !== undefined ? { effectiveTo: values.effectiveTo } : {}),
      ...(values.fileUrl !== undefined ? { fileUrl: values.fileUrl } : {}),
      ...(values.note !== undefined ? { note: values.note } : {}),
    };

    const [row] = await tx
      .insert(employeeContracts)
      .values(insertValues)
      .returning();
    return row ?? null;
  }

}


