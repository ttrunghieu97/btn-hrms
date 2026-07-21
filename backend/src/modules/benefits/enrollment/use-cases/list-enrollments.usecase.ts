import { Injectable } from "@nestjs/common";
import { BenefitEnrollmentRepository } from "../repositories/benefit-enrollment.repository";
import { EnrollmentResponseDto } from "../../dto/benefit.dto";
@Injectable()
export class ListEnrollmentsUseCase {
  constructor(private readonly repo: BenefitEnrollmentRepository) {}
  async execute(employeeId?: string): Promise<EnrollmentResponseDto[]> {
    const rows = employeeId ? await this.repo.findByEmployee(employeeId) : await this.repo.findByEmployee("");
    return rows.map((r) => ({ id: r.id, planId: r.planId, employeeId: r.employeeId, status: r.status, coverageType: r.coverageType }));
  }
}
