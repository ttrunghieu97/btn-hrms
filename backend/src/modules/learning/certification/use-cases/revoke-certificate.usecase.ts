import { Injectable } from "@nestjs/common";
import { CertificationRepository } from "../repositories/certification.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { CertificateRevokedEvent } from "../../../../core/events/events/certificate-revoked.event";
@Injectable()
export class RevokeCertificateUseCase {
  constructor(private readonly repo: CertificationRepository, private readonly eventOutbox: EventOutboxService) {}
  async execute(id: string, revokedByUserId: string): Promise<void> {
    const cert = await this.repo.findCertById(id);
    if (!cert) throwNotFound("Certificate not found", ERROR_CODES.NOT_FOUND);
    if (cert.status !== "active") throwBadRequest("Only active certificates can be revoked", ERROR_CODES.INVALID_REQUEST);
    await this.repo.updateCert(id, { status: "revoked", revokedAt: new Date() });
    await this.eventOutbox.stage(new CertificateRevokedEvent({ certificationId: id, definitionId: cert.definitionId, employeeId: cert.employeeId, revokedByUserId }));
  }
}