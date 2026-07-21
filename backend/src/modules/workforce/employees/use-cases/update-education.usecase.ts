import { Injectable } from "@nestjs/common";
import { EmployeeEducationRepository } from "../repositories/employee-education.repository";
import { EducationAggregationService } from "../services/education-aggregation.service";
import type { UpdateEducationDto } from "../dto/education.dto";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class UpdateEducationUseCase {
  constructor(
    private readonly educationRepo: EmployeeEducationRepository,
    private readonly aggregation: EducationAggregationService,
  ) {}

  async execute(employeeId: string, educationId: string, dto: UpdateEducationDto) {
    const existing = await this.educationRepo.findById(educationId);
    if (existing?.employeeId !== employeeId) {
      throwNotFound("Education record not found", ERROR_CODES.NOT_FOUND);
    }

    const updated = await this.educationRepo.update(educationId, {
      ...(dto.educationLevel !== undefined ? { educationLevel: dto.educationLevel } : {}),
      ...(dto.educationName !== undefined ? { educationName: dto.educationName } : {}),
      ...(dto.major !== undefined ? { major: dto.major } : {}),
      ...(dto.institution !== undefined ? { institution: dto.institution } : {}),
      ...(dto.graduationYear !== undefined ? { graduationYear: dto.graduationYear } : {}),
      ...(dto.gpa !== undefined ? { gpa: String(dto.gpa) } : {}),
      ...(dto.documentId !== undefined ? { documentId: dto.documentId } : {}),
      ...(dto.verified !== undefined ? { verified: dto.verified } : {}),
    });

    if (dto.educationLevel !== undefined) {
      await this.aggregation.recomputeHighestEducation(employeeId);
    }

    return updated;
  }
}
