import { DomainEvent } from "../domain-event.base";
export type CertificateRenewedEventPayload = { certificationId: string; definitionId: string; employeeId: string; expiresAt: string | null };
export class CertificateRenewedEvent extends DomainEvent<CertificateRenewedEventPayload> {
  static readonly eventType = "learning.certificate.renewed.v1";
  static readonly eventVersion = 1;
  constructor(payload: CertificateRenewedEventPayload, correlationId?: string) {
    super(CertificateRenewedEvent.eventType, "learning", payload, correlationId);
  }
}
