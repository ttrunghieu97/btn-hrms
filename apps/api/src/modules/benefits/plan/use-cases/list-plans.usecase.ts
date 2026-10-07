import { Injectable } from "@nestjs/common";
import { BenefitPlanRepository } from "../repositories/benefit-plan.repository";
import { PlanResponseDto } from "../../dto/benefit.dto";
@Injectable()
export class ListPlansUseCase {
  constructor(private readonly repo: BenefitPlanRepository) {}
  async execute(): Promise<PlanResponseDto[]> {
    const rows = await this.repo.findMany();
    return rows.map((r) => ({ id: r.id, name: r.name, status: r.status, coverageType: r.coverageType, employerContribution: r.employerContribution, employeeContribution: r.employeeContribution }));
  }
}
