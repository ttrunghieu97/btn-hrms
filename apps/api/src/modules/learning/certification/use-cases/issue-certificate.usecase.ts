import { Injectable } from "@nestjs/common";
import { CertificationRepository } from "../repositories/certification.repository";
import { IssueCertificateDto, CertResponseDto } from "../../dto/learning.dto";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { CertificateIssuedEvent } from "../../../../core/events/events/certificate-issued.event";
import { randomUUID } from "node:crypto";
@Injectable()
export class IssueCertificateUseCase {
  constructor(private readonly repo: CertificationRepository, private readonly eventOutbox: EventOutboxService) {}
  async execute(dto: IssueCertificateDto, issuedByUserId: string): Promise<CertResponseDto> {
    const def = await this.repo.findDefById(dto.definitionId);
    if (!def) throwNotFound("Certification definition not found", ERROR_CODES.NOT_FOUND);
    if (def.status !== "active") throwBadRequest("Definition is not active", ERROR_CODES.INVALID_REQUEST);
    const certNumber = `CERT-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const expiresAt = def.validityMonths ? new Date(Date.now() + def.validityMonths * 30 * 24 * 60 * 60 * 1000) : null;
    const r = await this.repo.insertCert({ definitionId: dto.definitionId, employeeId: dto.employeeId, courseId: dto.courseId ?? null, certificateNumber: certNumber, status: "active", issuedByUserId, expiresAt });
    await this.eventOutbox.stage(new CertificateIssuedEvent({ certificationId: r.id, definitionId: dto.definitionId, employeeId: dto.employeeId, certificateNumber: certNumber }));
    return { id: r.id, definitionId: r.definitionId, employeeId: r.employeeId, status: r.status, certificateNumber: r.certificateNumber, issuedAt: r.issuedAt, expiresAt: r.expiresAt };
  }
}