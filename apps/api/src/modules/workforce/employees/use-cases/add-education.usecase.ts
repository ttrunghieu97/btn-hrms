import { Injectable } from "@nestjs/common";
import { EmployeeEducationRepository } from "../repositories/employee-education.repository";
import { EducationAggregationService } from "../services/education-aggregation.service";
import type { CreateEducationDto } from "../dto/education.dto";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";

@Injectable()
export class AddEducationUseCase {
  constructor(
    private readonly educationRepo: EmployeeEducationRepository,
    private readonly aggregation: EducationAggregationService,
  ) {}

  async execute(employeeId: string, dto: CreateEducationDto) {
    if (!employeeId) {
      throwBadRequest("employeeId is required", ERROR_CODES.INVALID_REQUEST, {
        reason: ERROR_REASONS.INVALID_STATE,
      });
    }

    const record = await this.educationRepo.create({
      employeeId,
      educationLevel: dto.educationLevel,
      educationName: dto.educationName ?? null,
      major: dto.major ?? null,
      institution: dto.institution ?? null,
      graduationYear: dto.graduationYear ?? null,
      gpa: dto.gpa != null ? String(dto.gpa) : null,
      documentId: dto.documentId ?? null,
      verified: false,
    });

    await this.aggregation.recomputeHighestEducation(employeeId);
    return record;
  }
}
