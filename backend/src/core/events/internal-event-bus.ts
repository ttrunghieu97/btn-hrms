import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { IEventBus, EventHandler } from "./event-bus.interface";
import { DomainEvent } from "./domain-event.base";

@Injectable()
export class InternalEventBus implements IEventBus {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.eventEmitter.emitAsync(event.eventType, event);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  on<TEvent = DomainEvent>(eventName: string, handler: EventHandler<TEvent>): void {
    this.eventEmitter.on(eventName, (event: TEvent) => void handler(event));
  }
}
