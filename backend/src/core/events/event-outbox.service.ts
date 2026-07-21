import { Injectable } from "@nestjs/common";
import { registerWorkforceEvents, registerLeaveEvents, registerSchedulingEvents, registerTasksEvents, registerApprovalEvents, registerPayrollEvents, registerRecruitmentEvents, registerAssetEvents, registerOnboardingEvents, registerOffboardingEvents } from "../../shared/events/event-types";
import { assertEventRegistered, validatePayload } from "../../shared/events/event-registry";
import { randomUUID } from "crypto";
import { TracingService } from "../../shared/context/tracing.service";

registerWorkforceEvents();
registerLeaveEvents();
registerSchedulingEvents();
registerTasksEvents();
registerApprovalEvents();
registerPayrollEvents();
registerRecruitmentEvents();
registerAssetEvents();
registerOnboardingEvents();
registerOffboardingEvents();
import {
  assertCanonicalEventEnvelope,
  CanonicalEventEnvelope,
} from "./canonical-event-envelope";
import { RequestContextService } from "../../shared/context/request-context.service";
import { EventOutboxRepository } from "./event-outbox.repository";
import { MetricsService } from "../../shared/metrics/metrics.service";
import type { AppDatabase } from "../../infrastructure/database/database-client.type";

type EventLike = {
  eventType?: unknown;
  eventVersion?: unknown;
  eventId?: unknown;
  producerContext?: unknown;
  scopeId?: unknown;
  payload?: unknown;
  id?: unknown;
  employeeId?: unknown;
};

function eventLike(value: unknown): EventLike {
  return typeof value === "object" && value !== null ? value : {};
}

function eventConstructorName(value: unknown) {
  if (typeof value !== "object" || value === null) return undefined;
  return value.constructor?.name;
}

function payloadAggregateId(payload: unknown) {
  if (typeof payload !== "object" || payload === null) return null;
  const value = payload as EventLike;
  const aggregateId = value.id ?? value.employeeId;
  return typeof aggregateId === "string" ? aggregateId : null;
}

@Injectable()
export class EventOutboxService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly outboxRepo: EventOutboxRepository,
    private readonly metrics: MetricsService,
    private readonly tracing: TracingService,
  ) {}

  async stage(event: unknown, tx?: AppDatabase) {
    const envelope = this.toEnvelope(event);

    // Event versioning enforcement
    const baseType = envelope.eventType.replace(/^workforce\./, "").replace(/\.v\d+$/, "");
    const eventVersion = envelope.eventVersion ?? 1;
    assertEventRegistered(baseType, eventVersion);
    // DomainEvent stores payload in .data; plain events use payload directly
    const payloadToValidate = (envelope.payload as any)?.data ?? envelope.payload;
    validatePayload(baseType, eventVersion, payloadToValidate);

    const row = await this.outboxRepo.insert(envelope, tx);
    this.metrics.incrementOutboxEventsCreated(
      envelope.producerContext,
      envelope.eventType,
    );
    return row;
  }

  private toEnvelope(event: unknown): CanonicalEventEnvelope {
    const source = eventLike(event);
    const eventType = String(
      source.eventType || eventConstructorName(event) || "UnknownEvent",
    );
    const sourceEventId: string | null = typeof source.eventId === "string" ? source.eventId : null;
    const eventVersion = Number(source.eventVersion ?? 1);
    const producerContext = String(source.producerContext || "core");
    const scopeId = source.scopeId ?? null;
    const rawPayload: unknown = JSON.parse(
      JSON.stringify(source.payload ?? event),
    );
    const aggregateId = payloadAggregateId(rawPayload);

    // Inject distributed trace context
    const payload = rawPayload as Record<string, unknown>;
    const span = this.tracing.current();
    payload.__trace = {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      correlationId: span.correlationId,
    };

    const envelope: CanonicalEventEnvelope = {
      eventId: randomUUID(),
      eventType,
      eventVersion: Number.isInteger(eventVersion) ? eventVersion : 1,
      producerContext,
      scopeId: typeof scopeId === "string" ? scopeId : null,
      aggregateId,
      correlationId: this.requestContext.get()?.requestId ?? null,
      causationId: sourceEventId,
      payload,
      occurredAt: new Date().toISOString(),
    };
    assertCanonicalEventEnvelope(envelope, "event_outbox");
    return envelope;
  }
}
