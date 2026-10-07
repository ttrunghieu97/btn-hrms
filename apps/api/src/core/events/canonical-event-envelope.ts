export interface CanonicalEventEnvelope<
  TPayload = Record<string, unknown> | unknown,
> {
  eventId: string;
  eventType: string;
  eventVersion: number;
  producerContext: string;
  scopeId: string | null;
  aggregateId: string | null;
  occurredAt: string;
  correlationId?: string | null;
  causationId?: string | null;
  payload: TPayload;
}

export function assertCanonicalEventEnvelope(
  envelope: CanonicalEventEnvelope,
  source: string,
) {
  const requiredString = [
    "eventId",
    "eventType",
    "producerContext",
    "occurredAt",
  ] as const;

  for (const key of requiredString) {
    const value = envelope[key];
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`invalid_event_envelope_${source}_${key}`);
    }
  }

  if (!Number.isInteger(envelope.eventVersion) || envelope.eventVersion < 1) {
    throw new Error(`invalid_event_envelope_${source}_eventVersion`);
  }

  if (envelope.scopeId !== null && typeof envelope.scopeId !== "string") {
    throw new Error(`invalid_event_envelope_${source}_scopeId`);
  }

  if (
    envelope.aggregateId !== null &&
    typeof envelope.aggregateId !== "string"
  ) {
    throw new Error(`invalid_event_envelope_${source}_aggregateId`);
  }
}
