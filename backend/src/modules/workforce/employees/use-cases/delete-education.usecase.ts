import { Injectable } from "@nestjs/common";
import { EmployeeEducationRepository } from "../repositories/employee-education.repository";
import { EducationAggregationService } from "../services/education-aggregation.service";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class DeleteEducationUseCase {
  constructor(
    private readonly educationRepo: EmployeeEducationRepository,
    private readonly aggregation: EducationAggregationService,
  ) {}

  async execute(employeeId: string, educationId: string) {
    const existing = await this.educationRepo.findById(educationId);
    if (existing?.employeeId !== employeeId) {
      throwNotFound("Education record not found", ERROR_CODES.NOT_FOUND);
    }

    await this.educationRepo.softDelete(educationId);
    await this.aggregation.recomputeHighestEducation(employeeId);
  }
}
