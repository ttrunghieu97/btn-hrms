import { Injectable } from "@nestjs/common";
import { BenefitPlanRepository } from "../repositories/benefit-plan.repository";
import { PlanResponseDto } from "../../dto/benefit.dto";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
@Injectable()
export class GetPlanUseCase {
  constructor(private readonly repo: BenefitPlanRepository) {}
  async execute(id: string): Promise<PlanResponseDto> {
    const r = await this.repo.findById(id);
    if (!r) throwNotFound("Plan not found", ERROR_CODES.NOT_FOUND);
    return { id: r.id, name: r.name, status: r.status, coverageType: r.coverageType, employerContribution: r.employerContribution, employeeContribution: r.employeeContribution };
  }
}
