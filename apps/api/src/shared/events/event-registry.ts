/**
 * Central registry for all workforce domain events.
 * Every event type must be registered here before it can be published.
 * Versions are explicit — never implicit. v1 events are frozen.
 */

export interface EventDefinition {
  type: string;
  version: number;
  description?: string;
  producer?: string;
  deprecated?: boolean;
  /** List of required top-level payload fields. null = any shape accepted */
  requiredFields?: string[] | null;
  /** Allow unknown fields beyond the required set */
  strict?: boolean;
}

export type EventRegistration = EventDefinition;

const registry = new Map<string, EventDefinition>();

export function registerEvent(def: EventDefinition): void {
  const key = `${def.type}.v${def.version}`;
  if (registry.has(key)) {
    throw new Error(`Event already registered: ${key}`);
  }
  registry.set(key, def);
}

export function getEventDefinition(eventType: string, version: number): EventDefinition | undefined {
  return registry.get(`${eventType}.v${version}`);
}

export function assertEventRegistered(eventType: string, version?: number): void {
  if (version !== undefined) {
    const def = getEventDefinition(eventType, version);
    if (!def) {
      throw new Error(`Unknown event: ${eventType}.v${version}. Register it first.`);
    }
    if (def.deprecated) {
      throw new Error(`Cannot publish deprecated event: ${eventType}.v${version}`);
    }
    return;
  }
  // Check if any version exists for this type
  for (const [, def] of registry) {
    if (def.type === eventType) return;
  }
  throw new Error(`Unknown event type: ${eventType}. No version registered.`);
}

export function getLatestVersion(eventType: string): number | undefined {
  let latest: number | undefined;
  for (const [, def] of registry) {
    if (def.type === eventType && !def.deprecated) {
      if (latest === undefined || def.version > latest) latest = def.version;
    }
  }
  return latest;
}

export function validatePayload(eventType: string, version: number, payload: unknown): void {
  const def = getEventDefinition(eventType, version);
  if (!def) throw new Error(`Unknown event for validation: ${eventType}.v${version}`);
  if (!def.requiredFields) return; // no schema constraint → always valid

  if (typeof payload !== "object" || payload === null) {
    throw new Error(`Payload for ${eventType}.v${version} must be an object`);
  }

  const data = payload as Record<string, unknown>;

  for (const field of def.requiredFields) {
    if (!(field in data) || data[field] === undefined) {
      throw new Error(`Missing required field "${field}" in ${eventType}.v${version}`);
    }
  }

  if (def.strict !== false) {
    for (const key of Object.keys(data)) {
      if (!def.requiredFields.includes(key)) {
        throw new Error(`Unknown field "${key}" in strict schema ${eventType}.v${version}. Allowed: ${def.requiredFields.join(", ")}`);
      }
    }
  }
}

/** Check if a subscriber supports a given event version */
export function subscriberSupports(
  supportedVersions: number[],
  targetVersion: number,
): boolean {
  return supportedVersions.includes(targetVersion);
}
