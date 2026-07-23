import { Injectable, Inject } from "@nestjs/common";
import { eq, inArray } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import * as schema from "../../../../infrastructure/database/schema";
import type {
  EmployeeQualificationRecord,
  EmployeeQualificationWithNames,
  IEmployeeQualificationsRepository,
} from "./employee-qualifications.repository.contract";

@Injectable()
export class EmployeeQualificationsRepository implements IEmployeeQualificationsRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {}

  async getEmployeeQualifications(
    employeeId: string
  ): Promise<EmployeeQualificationWithNames[]> {
    return this.db.query.employeeQualifications.findMany({
      where: eq(schema.employeeQualifications.employeeId, employeeId),
      with: {
        position: {
          columns: { id: true, name: true },
        },
      },
    });
  }

  async replaceEmployeeQualifications(
    employeeId: string,
    positionIds: string[]
  ): Promise<EmployeeQualificationWithNames[]> {
    return this.db.transaction(async (tx) => {
      // Delete existing
      await tx
        .delete(schema.employeeQualifications)
        .where(eq(schema.employeeQualifications.employeeId, employeeId));

      // Insert new
      if (positionIds.length > 0) {
        await tx.insert(schema.employeeQualifications).values(
          positionIds.map((positionId) => ({ employeeId, positionId }))
        );
      }

      // Return new state
      return tx.query.employeeQualifications.findMany({
        where: eq(schema.employeeQualifications.employeeId, employeeId),
        with: {
          position: {
            columns: { id: true, name: true },
          },
        },
      });
    });
  }
}
