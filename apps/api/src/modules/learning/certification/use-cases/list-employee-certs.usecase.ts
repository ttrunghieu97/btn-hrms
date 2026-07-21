import { Injectable } from "@nestjs/common";
import { CertificationRepository } from "../repositories/certification.repository";
import { CertResponseDto } from "../../dto/learning.dto";
@Injectable()
export class ListEmployeeCertificatesUseCase {
  constructor(private readonly repo: CertificationRepository) {}
  async execute(employeeId: string): Promise<CertResponseDto[]> {
    const rows = await this.repo.findCertsByEmployee(employeeId);
    return rows.map((r) => ({ id: r.id, definitionId: r.definitionId, employeeId: r.employeeId, status: r.status, certificateNumber: r.certificateNumber, issuedAt: r.issuedAt, expiresAt: r.expiresAt }));
  }
}