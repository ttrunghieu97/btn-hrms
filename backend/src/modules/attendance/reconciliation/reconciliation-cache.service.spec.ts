import { ReconciliationCacheService } from "./reconciliation-cache.service";
import type { ReconcileResult } from "./reconciliation.service";

const makeResult = (overrides?: Partial<ReconcileResult>): ReconcileResult => ({
  sessions: [],
  violations: [],
  stats: { noShowCount: 0, lateCount: 0, overtimeCount: 0, completionRate: 1, totalAssignments: 0 },
  ...overrides,
});

describe("ReconciliationCacheService", () => {
  let cache: ReconciliationCacheService;

  beforeEach(() => {
    cache = new ReconciliationCacheService();
  });

  afterEach(() => {
    cache.onModuleDestroy();
  });

  it("returns null for uncached date", () => {
    expect(cache.getCached("2026-06-25")).toBeNull();
  });

  it("stores and retrieves full result", () => {
    const result = makeResult({ stats: { noShowCount: 1, lateCount: 0, overtimeCount: 0, completionRate: 0.5, totalAssignments: 2 } });
    cache.merge("2026-06-25", result);
    expect(cache.getCached("2026-06-25")).toEqual(result);
  });

  it("marks dirty on employee invalidation", () => {
    cache.merge("2026-06-25", makeResult());
    cache.markEmployeeDirty("2026-06-25", "emp1");
    expect(cache.isDirty("2026-06-25")).toBe(true);
    expect(cache.getDirtyEmployees("2026-06-25").has("emp1")).toBe(true);
  });

  it("returns null for dirty cache", () => {
    cache.merge("2026-06-25", makeResult());
    cache.markEmployeeDirty("2026-06-25", "emp1");
    expect(cache.getCached("2026-06-25")).toBeNull();
  });

  it("clears dirty after merge", () => {
    cache.merge("2026-06-25", makeResult());
    cache.markEmployeeDirty("2026-06-25", "emp1");
    cache.merge("2026-06-25", makeResult({ stats: { noShowCount: 2, lateCount: 0, overtimeCount: 0, completionRate: 0, totalAssignments: 2 } }));
    expect(cache.isDirty("2026-06-25")).toBe(false);
    expect(cache.getCached("2026-06-25")).not.toBeNull();
  });

  it("hasCache returns true after initial store", () => {
    expect(cache.hasCache("2026-06-25")).toBe(false);
    cache.merge("2026-06-25", makeResult());
    expect(cache.hasCache("2026-06-25")).toBe(true);
  });
});
