import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { IEventBus, EventHandler } from "./event-bus.interface";
import { DomainEvent } from "./domain-event.base";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeDispatchedEvent(event: unknown): Record<string, unknown> {
  if (event instanceof DomainEvent) {
    return event as unknown as Record<string, unknown>;
  }
  if (!isRecord(event)) {
    return { value: event };
  }
  if ("payload" in event && !("data" in event)) {
    const rawPayload = isRecord(event.payload)
      ? event.payload
      : { value: event.payload };
    const nestedData = isRecord(rawPayload.data) ? rawPayload.data : null;
    const scopeId =
      typeof event.scopeId === "string"
        ? event.scopeId
        : typeof rawPayload.scopeId === "string"
          ? rawPayload.scopeId
          : nestedData && typeof nestedData.scopeId === "string"
            ? nestedData.scopeId
            : null;
    return {
      ...rawPayload,
      ...(nestedData ?? {}),
      ...event,
      scopeId,
      data: nestedData ?? rawPayload,
      payload: event.payload,
      eventId:
        typeof event.eventId === "string" && event.eventId
          ? event.eventId
          : typeof rawPayload.eventId === "string"
            ? rawPayload.eventId
            : undefined,
    };
  }
  return event;
}

@Injectable()
export class InternalEventBus implements IEventBus {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publish(event: unknown): Promise<void> {
    if (!event) return;
    const normalized = normalizeDispatchedEvent(event);
    const eventType = String(
      normalized.eventType ||
        (isRecord(event) ? event.constructor?.name : undefined) ||
        "UnknownEvent",
    );
    await this.eventEmitter.emitAsync(eventType, normalized);
  }

  async publishAll(events: unknown[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  on<TEvent = DomainEvent>(eventName: string, handler: EventHandler<TEvent>): void {
    this.eventEmitter.on(eventName, (event: TEvent) => handler(event));
  }
}
