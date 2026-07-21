import { DomainEvent } from "../domain-event.base";
export type CertificateRevokedEventPayload = { certificationId: string; definitionId: string; employeeId: string; revokedByUserId: string };
export class CertificateRevokedEvent extends DomainEvent<CertificateRevokedEventPayload> {
  static readonly eventType = "learning.certificate.revoked.v1";
  static readonly eventVersion = 1;
  constructor(payload: CertificateRevokedEventPayload, correlationId?: string) {
    super(CertificateRevokedEvent.eventType, "learning", payload, correlationId);
  }
}
