import { Injectable } from "@nestjs/common";
import { CertificationRepository } from "../repositories/certification.repository";
import { CreateCertificationDefDto, CertResponseDto } from "../../dto/learning.dto";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
@Injectable()
export class CreateCertificationDefUseCase {
  constructor(private readonly repo: CertificationRepository) {}
  async execute(dto: CreateCertificationDefDto): Promise<CertResponseDto> {
    if (!dto.name?.trim()) throwBadRequest("Name is required", ERROR_CODES.INVALID_REQUEST);
    const r = await this.repo.insertDef({ name: dto.name, description: dto.description ?? null, issuer: dto.issuer ?? null, validityMonths: dto.validityMonths ?? null, status: "active" });
    return { id: r.id, definitionId: r.id, employeeId: "", status: r.status, certificateNumber: null, issuedAt: r.createdAt, expiresAt: null };
  }
}