import { type DomainEvent } from "./domain-event.base";

export const EVENT_BUS_TOKEN = Symbol("EVENT_BUS_TOKEN");

/** @deprecated Use EVENT_BUS_TOKEN instead */
export const EVENT_BUS = Symbol("EVENT_BUS");

export type EventHandler<TEvent = DomainEvent> = (
  event: TEvent,
) => Promise<void> | void;

export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
  on<TEvent = DomainEvent>(eventType: string, handler: EventHandler<TEvent>): void;
  onUpcast?(eventType: string, upcaster: (envelope: unknown) => unknown): void;
}

