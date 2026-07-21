import { DomainEvent } from "../domain-event.base";
export type CertificateExpiredEventPayload = { certificationId: string; definitionId: string; employeeId: string };
export class CertificateExpiredEvent extends DomainEvent<CertificateExpiredEventPayload> {
  static readonly eventType = "learning.certificate.expired.v1";
  static readonly eventVersion = 1;
  constructor(payload: CertificateExpiredEventPayload, correlationId?: string) {
    super(CertificateExpiredEvent.eventType, "learning", payload, correlationId);
  }
}
