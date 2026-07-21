import { randomUUID } from "node:crypto";
import { getScopeId } from "../../shared/constants/system";

export abstract class DomainEvent<T = unknown> {
  public readonly eventId: string;
  public readonly timestamp: string;
  public readonly scopeId: string;

  constructor(
    public readonly eventType: string,
    public readonly source: string,
    public readonly data: T,
    public readonly correlationId?: string,
  ) {
    this.eventId = randomUUID();
    this.timestamp = new Date().toISOString();
    this.scopeId = getScopeId();
  }
}
