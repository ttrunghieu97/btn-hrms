import { Injectable, OnModuleDestroy } from "@nestjs/common";
import type { ReconcileResult } from "./reconciliation.service";

interface CachedDay {
  date: string;
  result: ReconcileResult;
  dirtyEmployees: Set<string>;
  dirty: boolean;
  lastComputedAt: Date;
  expiresAt: number;
}

@Injectable()
export class ReconciliationCacheService implements OnModuleDestroy {
  /** In-memory store: date → CachedDay */
  private store = new Map<string, CachedDay>();

  private static readonly TTL_MS = 5 * 60 * 1000;
  private static readonly MAX_SIZE = 100;
  private static readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupTimer = setInterval(
      () => this.purgeExpired(),
      ReconciliationCacheService.CLEANUP_INTERVAL_MS,
    );
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
  }

  // ─── Read ────────────────────────────────────────────────────────

  getCached(date: string): ReconcileResult | null {
    const day = this.store.get(date);
    if (!day) return null;
    if (day.dirty) return null;
    if (Date.now() > day.expiresAt) {
      this.store.delete(date);
      return null;
    }
    return day.result;
  }

  hasCache(date: string): boolean {
    const day = this.store.get(date);
    if (!day) return false;
    if (Date.now() > day.expiresAt) {
      this.store.delete(date);
      return false;
    }
    return true;
  }

  isDirty(date: string): boolean {
    const day = this.store.get(date);
    if (!day) return true;
    if (Date.now() > day.expiresAt) {
      this.store.delete(date);
      return true;
    }
    return day.dirty;
  }

  getDirtyEmployees(date: string): Set<string> {
    return this.store.get(date)?.dirtyEmployees ?? new Set();
  }

  // ─── Invalidation ────────────────────────────────────────────────

  markEmployeeDirty(date: string, employeeId: string): void {
    const day = this.ensureDay(date);
    day.dirtyEmployees.add(employeeId);
    day.dirty = true;
  }

  markAllDirty(date: string): void {
    const day = this.ensureDay(date);
    day.dirty = true;
  }

  // ─── Write ───────────────────────────────────────────────────────

  merge(date: string, partial: ReconcileResult): ReconcileResult {
    const day = this.ensureDay(date);
    const existing = day.result;

    if (!day.dirty || existing.sessions.length === 0) {
      day.result = partial;
    } else {
      const affectedEmployees = day.dirtyEmployees;

      const keptSessions = existing.sessions.filter(
        (s) => !affectedEmployees.has(s.employeeId),
      );
      day.result.sessions = [...keptSessions, ...partial.sessions];

      const keptViolations = existing.violations.filter(
        (v) => !affectedEmployees.has(v.employeeId),
      );
      day.result.violations = [...keptViolations, ...partial.violations];

      const allSessions = day.result.sessions;
      day.result.stats = {
        noShowCount: allSessions.filter((s) => s.status === "NO_SHOW").length,
        lateCount: day.result.violations.filter((v) => v.type === "LATE").length,
        overtimeCount: day.result.violations.filter((v) => v.type === "OVERTIME").length,
        completionRate:
          allSessions.length > 0
            ? allSessions.filter((s) => s.status === "COMPLETED" || s.status === "PARTIAL").length /
              allSessions.length
            : 1,
        totalAssignments: allSessions.length,
      };
    }

    day.dirty = false;
    day.dirtyEmployees.clear();
    day.lastComputedAt = new Date();
    day.expiresAt = Date.now() + ReconciliationCacheService.TTL_MS;

    return day.result;
  }

  size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  // ─── Private ─────────────────────────────────────────────────────

  private ensureDay(date: string): CachedDay {
    const existing = this.store.get(date);
    if (existing) return existing;

    if (this.store.size >= ReconciliationCacheService.MAX_SIZE) {
      this.evictOne();
    }

    const day: CachedDay = {
      date,
      result: { sessions: [], violations: [], stats: { noShowCount: 0, lateCount: 0, overtimeCount: 0, completionRate: 1, totalAssignments: 0 } },
      dirtyEmployees: new Set(),
      dirty: true,
      lastComputedAt: new Date(0),
      expiresAt: Date.now() + ReconciliationCacheService.TTL_MS,
    };
    this.store.set(date, day);
    return day;
  }

  private evictOne(): void {
    const oldest = this.store.keys().next();
    if (!oldest.done && oldest.value) {
      this.store.delete(oldest.value);
    }
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [key, day] of this.store) {
      if (now > day.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}
