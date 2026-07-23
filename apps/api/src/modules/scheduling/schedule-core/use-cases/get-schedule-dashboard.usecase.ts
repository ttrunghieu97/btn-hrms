import { Injectable } from "@nestjs/common";
import { ScheduleRepository } from "../repositories/schedule.repository";
import { CoverageService, type CoverageRow } from "../../shifts/schedule-roster/services/coverage.service";
import { type DailyScheduleRecord, type ScheduleRequirementRecord } from "../repositories/schedule.repository.contract";
import { WorkforceShiftsRepository } from "../../shifts/schedule-roster/repositories/workforce-shifts.repository";
import { ReconciliationService, type Violation as ReconViolation } from "../../../attendance/reconciliation/reconciliation.service";
import { ReconciliationCacheService } from "../../../attendance/reconciliation/reconciliation-cache.service";
import type { ReconcileResult } from "../../../attendance/reconciliation/reconciliation.service";

export interface CoverageViolation {
  type: "COVERAGE_SHORTAGE";
  locationId?: string;
  locationName?: string;
  workRoleId?: string;
  workRoleName?: string;
  shiftTemplateId?: string;
  shiftTemplateName?: string;
  required: number;
  assigned: number;
}

export interface DashboardViolation {
  type: "COVERAGE_SHORTAGE" | "NO_SHOW" | "LATE" | "EARLY_LEAVE" | "OVERTIME" | "DOUBLE_CLOCK_IN";
  severity?: string;
  locationId?: string;
  locationName?: string;
  workRoleId?: string;
  workRoleName?: string;
  shiftTemplateId?: string;
  shiftTemplateName?: string;
  required?: number;
  assigned?: number;
  message?: string;
}

@Injectable()
export class GetScheduleDashboardUseCase {
  constructor(
    private readonly repo: ScheduleRepository,
    private readonly coverageService: CoverageService,
    private readonly assignmentRepo: WorkforceShiftsRepository,
    private readonly reconciler: ReconciliationService,
    private readonly reconCache: ReconciliationCacheService,
  ) {}

  async execute(date: string): Promise<{
    schedule: DailyScheduleRecord | null;
    requirements: ScheduleRequirementRecord[];
    coverage: CoverageRow[];
    violations: DashboardViolation[];
    assignmentCount: number;
    recon: { sessions: any[]; stats: any } | null;
  }> {
    const schedule = await this.repo.getSchedule(date);
    if (!schedule) {
      return { schedule: null, requirements: [], coverage: [], violations: [], assignmentCount: 0, recon: null };
    }

    const [requirements, coverage] = await Promise.all([
      this.repo.getRequirements(schedule.id),
      this.coverageService.getCoverage(date),
    ]);

    const rosterRows = await this.assignmentRepo.listRosterRows({ from: date, to: date });

    // Derive coverage violations
    const coverageViolations: CoverageViolation[] = coverage
      .filter((c) => c.assigned < c.required)
      .map((c) => ({
        type: "COVERAGE_SHORTAGE",
        locationId: c.locationId,
        locationName: c.locationName,
        workRoleId: c.workRoleId,
        workRoleName: c.workRoleName,
        shiftTemplateId: c.shiftTemplateId,
        shiftTemplateName: c.shiftTemplateName,
        required: c.required,
        assigned: c.assigned,
      }));

    // Build assignment windows
    const assignmentWindows = rosterRows.map((r: any) => ({
      id: r.assignmentId,
      employeeId: r.employeeId,
      scheduledStart: new Date(`${r.workDate}T${r.startTime}`),
      scheduledEnd: new Date(`${r.workDate}T${r.endTime}`),
    }));

    // Reconcile with cache
    const reconResult = await this.reconcileWithCache(date, assignmentWindows);

    const reconViolations: DashboardViolation[] = reconResult.violations.map((v: ReconViolation) => ({
      type: v.type as DashboardViolation["type"],
      severity: v.severity,
      message: v.message,
    }));

    return {
      schedule,
      requirements,
      coverage,
      violations: [...coverageViolations, ...reconViolations],
      assignmentCount: rosterRows.length,
      recon: {
        sessions: reconResult.sessions,
        stats: reconResult.stats,
      },
    };
  }

  private async reconcileWithCache(
    date: string,
    allAssignments: { id: string; employeeId: string; scheduledStart: Date; scheduledEnd: Date }[],
  ): Promise<ReconcileResult> {
    // Fast path: cache hit + no dirty employees
    const cached = this.reconCache.getCached(date);
    if (cached) return cached;

    // Check for incremental recompute
    const dirtyEmp = this.reconCache.getDirtyEmployees(date);

    if (dirtyEmp.size > 0 && this.reconCache.hasCache(date)) {
      // Only recompute dirty employees
      const dirtyAssignments = allAssignments.filter((a) => dirtyEmp.has(a.employeeId));
      // ponytail: events should be filtered by dirty employees too once DB query is wired
      const partialResult = this.reconciler.reconcile([], dirtyAssignments);
      return this.reconCache.merge(date, partialResult);
    }

    // Full recompute (first time or full invalidation)
    const fullResult = this.reconciler.reconcile([], allAssignments);
    return this.reconCache.merge(date, fullResult);
  }
}
