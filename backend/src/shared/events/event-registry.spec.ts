import {
  registerEvent,
  assertEventRegistered,
  validatePayload,
  subscriberSupports,
  getLatestVersion,
} from "./event-registry";
import { registerWorkforceEvents } from "./event-types";

describe("EventRegistry", () => {
  beforeAll(() => {
    // Pre-register known events so tests that validate against them work
    try { registerWorkforceEvents(); } catch { /* already registered */ }
  });

  beforeEach(() => {
    // Clear and re-register minimal known events for testing
    for (const key of [
      "employee.status-changed.v1",
      "employee.terminated.v1",
      "employee.rehired.v1",
      "employee.transfer-requested.v1",
    ]) {
      // Can't easily clear registry, but registering is idempotent-error
    }
  });

  // ─── Valid registration ──────────────────────────────────────────
  it("registers a valid event v1", () => {
    registerEvent({
      type: "employee.test",
      version: 1,
      description: "Test event",
      requiredFields: ["employeeId"],
    });
    expect(() => assertEventRegistered("employee.test", 1)).not.toThrow();
  });

  it("rejects duplicate registration", () => {
    registerEvent({
      type: "employee.dup-test",
      version: 1,
      requiredFields: ["employeeId"],
    });
    expect(() =>
      registerEvent({
        type: "employee.dup-test",
        version: 1,
        requiredFields: ["employeeId"],
      }),
    ).toThrow("already registered");
  });

  // ─── Unknown event type ───────────────────────────────────────────
  it("rejects unknown event type", () => {
    expect(() => assertEventRegistered("employee.unknown", 1)).toThrow("Unknown event");
  });

  it("rejects unknown event without version", () => {
    expect(() => assertEventRegistered("employee.nonexistent")).toThrow("Unknown event type");
  });

  // ─── Schema validation ────────────────────────────────────────────
  it("validates payload against required fields", () => {
    registerEvent({
      type: "employee.validation-test",
      version: 1,
      requiredFields: ["employeeId", "reason"],
      strict: true,
    });

    expect(() =>
      validatePayload("employee.validation-test", 1, { employeeId: "e1", reason: "test" }),
    ).not.toThrow();

    expect(() =>
      validatePayload("employee.validation-test", 1, { employeeId: "e1" }),
    ).toThrow("Missing required field");

    expect(() =>
      validatePayload("employee.validation-test", 1, { employeeId: "e1", reason: "test", unknownField: "x" }),
    ).toThrow("Unknown field");
  });

  it("allows unknown fields when strict is false", () => {
    registerEvent({
      type: "employee.loose-test",
      version: 1,
      requiredFields: ["employeeId"],
      strict: false,
    });

    expect(() =>
      validatePayload("employee.loose-test", 1, { employeeId: "e1", extraField: "ok" }),
    ).not.toThrow();
  });

  // ─── Version support───────────────────────────────────────────────
  it("subscriber supports v1 — processes", () => {
    expect(subscriberSupports([1], 1)).toBe(true);
  });

  it("subscriber does NOT support v2 — skipped", () => {
    expect(subscriberSupports([1], 2)).toBe(false);
  });

  it("subscriber supports multiple versions", () => {
    expect(subscriberSupports([1, 2], 2)).toBe(true);
    expect(subscriberSupports([1, 2], 3)).toBe(false);
  });

  // ─── Latest version ───────────────────────────────────────────────
  it("getLatestVersion returns highest non-deprecated version", () => {
    registerEvent({ type: "employee.versioned", version: 1, requiredFields: null, strict: false });
    registerEvent({ type: "employee.versioned", version: 2, requiredFields: null, strict: false });
    expect(getLatestVersion("employee.versioned")).toBe(2);
  });

  // ─── v1 backward compat ───────────────────────────────────────────
  it("v1 event still processes after v2 introduced", () => {
    registerEvent({ type: "employee.backward", version: 1, requiredFields: ["employeeId"] });
    registerEvent({ type: "employee.backward", version: 2, requiredFields: ["employeeId", "reason"] });

    // v1 payload (no reason) passes v1 validation
    expect(() => validatePayload("employee.backward", 1, { employeeId: "e1" })).not.toThrow();
    // v2 payload with extra field passes v2
    expect(() => validatePayload("employee.backward", 2, { employeeId: "e1", reason: "test" })).not.toThrow();
  });
});
