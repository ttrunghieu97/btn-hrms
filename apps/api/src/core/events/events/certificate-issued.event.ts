import { DomainEvent } from "../domain-event.base";
export type CertificateIssuedEventPayload = { certificationId: string; definitionId: string; employeeId: string; certificateNumber: string | null };
export class CertificateIssuedEvent extends DomainEvent<CertificateIssuedEventPayload> {
  static readonly eventType = "learning.certificate.issued.v1";
  static readonly eventVersion = 1;
  constructor(payload: CertificateIssuedEventPayload, correlationId?: string) {
    super(CertificateIssuedEvent.eventType, "learning", payload, correlationId);
  }
}
