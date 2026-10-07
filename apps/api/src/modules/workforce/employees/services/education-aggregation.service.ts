import { Injectable } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { employees } from "../../../../infrastructure/database/schema";
import { eq } from "drizzle-orm";
import { EmployeeEducationRepository } from "../repositories/employee-education.repository";

@Injectable()
export class EducationAggregationService {
  constructor(
    private readonly educationRepo: EmployeeEducationRepository,
    @Inject(DATABASE_CONNECTION)
    private readonly db: AppDatabase,
  ) {}

  /**
   * Recompute employees.highest_education_level from employee_educations.
   * Call after every education CRUD operation.
   */
  async recomputeHighestEducation(employeeId: string) {
    const highest = await this.educationRepo.getHighestLevel(employeeId);
    await this.db
      .update(employees)
      .set({
        highestEducationLevel: highest,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, employeeId));
  }
}
