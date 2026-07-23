import { Injectable } from "@nestjs/common";
import { BenefitPlanRepository } from "../repositories/benefit-plan.repository";
import { CreatePlanDto, PlanResponseDto } from "../../dto/benefit.dto";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class CreatePlanUseCase {
  constructor(private readonly repo: BenefitPlanRepository) {}
  async execute(dto: CreatePlanDto): Promise<PlanResponseDto> {
    if (!dto.name?.trim()) throwBadRequest("Plan name is required", ERROR_CODES.INVALID_REQUEST);
    const r = await this.repo.insert({
      name: dto.name, description: dto.description ?? null, providerId: dto.providerId ?? null,
      coverageType: dto.coverageType, status: "draft",
      employerContribution: String(dto.employerContribution ?? 0),
      employeeContribution: String(dto.employeeContribution ?? 0),
      effectiveFrom: dto.effectiveFrom ?? null, effectiveTo: dto.effectiveTo ?? null,
      maxEligibleAge: dto.maxEligibleAge ?? null,
    });
    return { id: r.id, name: r.name, status: r.status, coverageType: r.coverageType, employerContribution: r.employerContribution, employeeContribution: r.employeeContribution };
  }
}
