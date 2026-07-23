import { Injectable } from "@nestjs/common";
import { CertificationRepository } from "../repositories/certification.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { CertificateRenewedEvent } from "../../../../core/events/events/certificate-renewed.event";
@Injectable()
export class RenewCertificateUseCase {
  constructor(private readonly repo: CertificationRepository, private readonly eventOutbox: EventOutboxService) {}
  async execute(id: string): Promise<void> {
    const cert = await this.repo.findCertById(id);
    if (!cert) throwNotFound("Certificate not found", ERROR_CODES.NOT_FOUND);
    const def = await this.repo.findDefById(cert.definitionId);
    if (!def) throwNotFound("Definition not found", ERROR_CODES.NOT_FOUND);
    const expiresAt = def.validityMonths ? new Date(Date.now() + def.validityMonths * 30 * 24 * 60 * 60 * 1000) : null;
    await this.repo.updateCert(id, { status: "active", expiresAt, revokedAt: null });
    await this.eventOutbox.stage(new CertificateRenewedEvent({ certificationId: id, definitionId: cert.definitionId, employeeId: cert.employeeId, expiresAt: expiresAt?.toISOString() ?? null }));
  }
}