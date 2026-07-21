import { Injectable } from "@nestjs/common";
import { BenefitEnrollmentRepository } from "../repositories/benefit-enrollment.repository";
import { BenefitPlanRepository } from "../../plan/repositories/benefit-plan.repository";
import { EnrollEmployeeDto, EnrollmentResponseDto } from "../../dto/benefit.dto";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
@Injectable()
export class EnrollEmployeeUseCase {
  constructor(
    private readonly enrollRepo: BenefitEnrollmentRepository,
    private readonly planRepo: BenefitPlanRepository,
  ) {}
  async execute(dto: EnrollEmployeeDto): Promise<EnrollmentResponseDto> {
    const plan = await this.planRepo.findById(dto.planId);
    if (!plan) throwNotFound("Plan not found", ERROR_CODES.NOT_FOUND);
    if (plan.status !== "published") throwBadRequest("Plan must be published", ERROR_CODES.INVALID_REQUEST);
    const r = await this.enrollRepo.insert({
      planId: dto.planId, employeeId: dto.employeeId,
      coverageType: dto.coverageType, status: "pending",
      effectiveFrom: dto.effectiveFrom ?? plan.effectiveFrom,
      employerContribution: plan.employerContribution,
      employeeContribution: plan.employeeContribution,
    });
    return { id: r.id, planId: r.planId, employeeId: r.employeeId, status: r.status, coverageType: r.coverageType };
  }
}
