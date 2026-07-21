import { DashboardWidgetRegistry } from "../dashboard-widget-registry";
import { DashboardService } from "../dashboard.service";
import type { DashboardWidgetDefinition } from "../interfaces/dashboard-widget-definition.interface";
import type { DashboardWidgetProvider } from "../interfaces/dashboard-widget-provider.interface";
import type { DashboardContext } from "../interfaces/dashboard-context.interface";

// ── Helpers ─────────────────────────────────────────────────────────────────

const noopProvider: DashboardWidgetProvider<unknown> = {
  supports: () => true,
  execute: async () => ({}),
};

function def(overrides: Partial<DashboardWidgetDefinition> & { id: string }): DashboardWidgetDefinition {
  return {
    version: 1,
    enabled: true,
    category: "executive",
    type: "kpi",
    title: "Test",
    permissions: [],
    priority: 100,
    cacheTTL: 60,
    provider: noopProvider,
    ...overrides,
  };
}

function ctx(overrides?: Partial<DashboardContext>): DashboardContext {
  return {
    companyId: "test",
    dateRange: { start: new Date(), end: new Date() },
    currentUserId: "user-1",
    currentUserPermissions: [],
    currentUserRoles: [],
    timezone: "UTC",
    locale: "en",
    ...overrides,
  };
}

// ── Registry ordering invariants ────────────────────────────────────────────

describe("DashboardWidgetRegistry ordering", () => {
  it("sorts by priority ASC", () => {
    const reg = new DashboardWidgetRegistry();
    reg.register(def({ id: "b", priority: 20 }));
    reg.register(def({ id: "a", priority: 10 }));

    const resolved = reg.resolve(ctx());
    expect(resolved.map((d) => d.id)).toEqual(["a", "b"]);
  });

  it("sorts by category ASC when priority is equal", () => {
    const reg = new DashboardWidgetRegistry();
    reg.register(def({ id: "a", priority: 10, category: "workforce" }));
    reg.register(def({ id: "b", priority: 10, category: "executive" }));

    const resolved = reg.resolve(ctx());
    expect(resolved.map((d) => d.id)).toEqual(["b", "a"]);
  });

  it("sorts by id ASC when priority and category are equal", () => {
    const reg = new DashboardWidgetRegistry();
    reg.register(def({ id: "z", priority: 10, category: "executive" }));
    reg.register(def({ id: "a", priority: 10, category: "executive" }));

    const resolved = reg.resolve(ctx());
    expect(resolved.map((d) => d.id)).toEqual(["a", "z"]);
  });

  it("applies full sort: priority → category → id", () => {
    const reg = new DashboardWidgetRegistry();
    reg.register(def({ id: "c", priority: 30, category: "attendance" }));
    reg.register(def({ id: "a", priority: 10, category: "executive" }));
    reg.register(def({ id: "b", priority: 20, category: "attendance" }));

    const resolved = reg.resolve(ctx());
    expect(resolved.map((d) => d.id)).toEqual(["a", "b", "c"]);
  });
});

// ── Enabled filtering ──────────────────────────────────────────────────────

describe("DashboardWidgetRegistry enabled filtering", () => {
  it("excludes disabled widgets", () => {
    const reg = new DashboardWidgetRegistry();
    reg.register(def({ id: "a", enabled: true }));
    reg.register(def({ id: "b", enabled: false }));

    const resolved = reg.resolve(ctx());
    expect(resolved.map((d) => d.id)).toEqual(["a"]);
  });

  it("returns nothing when all are disabled", () => {
    const reg = new DashboardWidgetRegistry();
    reg.register(def({ id: "a", enabled: false }));

    expect(reg.resolve(ctx())).toEqual([]);
  });
});

// ── Permission filtering ────────────────────────────────────────────────────

describe("DashboardWidgetRegistry permission filtering", () => {
  it("excludes widgets when no permissions match", () => {
    const reg = new DashboardWidgetRegistry();
    reg.register(def({ id: "a", permissions: ["admin:view"] }));
    reg.register(def({ id: "b", permissions: ["dashboard:view"] }));

    const resolved = reg.resolve(ctx({ currentUserPermissions: ["dashboard:view"] }));
    expect(resolved.map((d) => d.id)).toEqual(["b"]);
  });

  it("includes widget when user has any of the required permissions", () => {
    const reg = new DashboardWidgetRegistry();
    reg.register(def({ id: "a", permissions: ["dashboard:view", "admin:view"] }));

    const resolved = reg.resolve(ctx({ currentUserPermissions: ["dashboard:view"] }));
    expect(resolved.map((d) => d.id)).toEqual(["a"]);
  });

  it("includes widget with empty permissions for all users", () => {
    const reg = new DashboardWidgetRegistry();
    reg.register(def({ id: "a", permissions: [] }));

    const resolved = reg.resolve(ctx({ currentUserPermissions: [] }));
    expect(resolved.map((d) => d.id)).toEqual(["a"]);
  });
});

// ── Provider support filtering ──────────────────────────────────────────────

describe("DashboardWidgetRegistry provider support", () => {
  it("excludes widgets whose provider returns false from supports()", () => {
    const reg = new DashboardWidgetRegistry();
    reg.register(def({ id: "a", provider: { supports: () => false, execute: async () => ({}) } }));
    reg.register(def({ id: "b", provider: { supports: () => true, execute: async () => ({}) } }));

    const resolved = reg.resolve(ctx());
    expect(resolved.map((d) => d.id)).toEqual(["b"]);
  });
});

// ── Fault isolation ─────────────────────────────────────────────────────────

describe("DashboardService fault isolation", () => {
  it("succeeds with empty definitions", async () => {
    const reg = new DashboardWidgetRegistry();
    const svc = new DashboardService(reg);

    const result = await svc.getWidgets(ctx());
    expect(result.widgets).toEqual([]);
    expect(result.meta.failedWidgets).toEqual([]);
    expect(result.meta.widgetCount).toBe(0);
  });

  it("returns other widgets when one provider throws", async () => {
    const reg = new DashboardWidgetRegistry();
    reg.register(def({ id: "good", provider: { supports: () => true, execute: async () => ({ ok: true }) } }));
    reg.register(def({ id: "bad", provider: { supports: () => true, execute: async () => { throw new Error("fail"); } } }));

    const svc = new DashboardService(reg);
    const result = await svc.getWidgets(ctx());

    expect(result.widgets.map((w) => w.id)).toEqual(["good"]);
    expect(result.meta.failedWidgets).toEqual(["bad"]);
    expect(result.meta.widgetCount).toBe(1);
  });

  it("reports all failed widgets", async () => {
    const reg = new DashboardWidgetRegistry();
    reg.register(def({ id: "a", provider: { supports: () => true, execute: async () => { throw new Error("err"); } } }));
    reg.register(def({ id: "b", provider: { supports: () => true, execute: async () => { throw new Error("err"); } } }));

    const svc = new DashboardService(reg);
    const result = await svc.getWidgets(ctx());

    expect(result.widgets).toEqual([]);
    expect(result.meta.failedWidgets).toEqual(["a", "b"]);
    expect(result.meta.widgetCount).toBe(0);
  });
});

// ── Execution metadata invariants ───────────────────────────────────────────

describe("DashboardService execution metadata", () => {
  it("includes generatedAt, durationMs, failedWidgets, widgetCount", async () => {
    const reg = new DashboardWidgetRegistry();
    reg.register(def({ id: "a", provider: { supports: () => true, execute: async () => ({ x: 1 }) } }));

    const svc = new DashboardService(reg);
    const result = await svc.getWidgets(ctx());

    expect(result.meta).toBeDefined();
    expect(result.meta.generatedAt).toBeInstanceOf(Date);
    expect(typeof result.meta.durationMs).toBe("number");
    expect(Array.isArray(result.meta.failedWidgets)).toBe(true);
    expect(result.meta.widgetCount).toBe(1);
  });

  it("assigns version and executionTimeMs to each widget", async () => {
    const reg = new DashboardWidgetRegistry();
    reg.register(def({ id: "a", version: 2, provider: { supports: () => true, execute: async () => ({}) } }));

    const svc = new DashboardService(reg);
    const result = await svc.getWidgets(ctx());

    expect(result.widgets[0]?.version).toBe(2);
    expect(typeof result.widgets[0]?.executionTimeMs).toBe("number");
  });
});
