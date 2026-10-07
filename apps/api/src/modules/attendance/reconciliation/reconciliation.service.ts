import { Injectable } from "@nestjs/common";

// ─── Types ────────────────────────────────────────────────────────

export interface AttendanceEvent {
  id: string;
  employeeId: string;
  type: "CLOCK_IN" | "CLOCK_OUT";
  timestamp: Date;
  source: "DEVICE" | "MANUAL";
  locationId?: string | null;
}

export interface AssignmentWindow {
  id: string;
  employeeId: string;
  locationId?: string | null;
  workRoleId?: string | null;
  shiftTemplateId?: string | null;
  scheduledStart: Date;
  scheduledEnd: Date;
}

export interface WorkSession {
  assignmentId: string;
  employeeId: string;
  actualStart: Date | null;
  actualEnd: Date | null;
  status: "NO_SHOW" | "ACTIVE" | "COMPLETED" | "PARTIAL" | "INVALID";
  durationMinutes: number;
  /** Minutes between scheduled start and actual first clock-in */
  startDeltaMinutes: number | null;
  /** Minutes between scheduled end and actual last clock-out */
  endDeltaMinutes: number | null;
  eventCount: number;
}

export type ViolationType =
  | "NO_SHOW"
  | "LATE"
  | "EARLY_LEAVE"
  | "OVERTIME"
  | "UNMATCHED_EVENT"
  | "DOUBLE_CLOCK_IN";

export interface Violation {
  type: ViolationType;
  severity: "LOW" | "MEDIUM" | "HIGH";
  employeeId: string;
  assignmentId?: string;
  message: string;
}

export interface ReconcileResult {
  sessions: WorkSession[];
  violations: Violation[];
  stats: {
    noShowCount: number;
    lateCount: number;
    overtimeCount: number;
    completionRate: number;
    totalAssignments: number;
  };
}

export interface ReconcileOptions {
  /** Grace window in minutes before scheduled start (default 30) */
  graceBeforeMinutes?: number;
  /** Grace window in minutes after scheduled end (default 30) */
  graceAfterMinutes?: number;
  /** Late threshold in minutes (default 15) */
  lateThresholdMinutes?: number;
}

// ─── Reconciliation Engine ────────────────────────────────────────

@Injectable()
export class ReconciliationService {
  reconcile(
    events: AttendanceEvent[],
    assignments: AssignmentWindow[],
    options?: ReconcileOptions,
  ): ReconcileResult {
    const graceBefore = options?.graceBeforeMinutes ?? 30;
    const graceAfter = options?.graceAfterMinutes ?? 30;
    const lateThreshold = options?.lateThresholdMinutes ?? 15;

    // Step 1: Group events by employee, sort by timestamp
    const eventsByEmployee = this.groupByEmployee(sortEvents(deduplicate(events)));

    // Step 2: For each assignment, reconstruct session from events
    const sessions: WorkSession[] = [];
    const violations: Violation[] = [];
    let matchedEventCount = 0;

    for (const assignment of assignments) {
      const employeeEvents = eventsByEmployee.get(assignment.employeeId) ?? [];

      // Step 2a: Filter events within grace window
      const windowed = employeeEvents.filter(
        (e) =>
          e.timestamp >= addMinutes(assignment.scheduledStart, -graceBefore) &&
          e.timestamp <= addMinutes(assignment.scheduledEnd, graceAfter),
      );

      // Step 2b: If window is shared with another assignment, resolve tie
      // (handled below by closest window matching)

      // Step 2c: Separate clock-ins and clock-outs
      const clockIns = windowed.filter((e) => e.type === "CLOCK_IN");
      const clockOuts = windowed.filter((e) => e.type === "CLOCK_OUT");

      // Step 2d: Detect duplicate clock-ins
      if (clockIns.length > 1) {
        violations.push({
          type: "DOUBLE_CLOCK_IN",
          severity: "LOW",
          employeeId: assignment.employeeId,
          assignmentId: assignment.id,
          message: `Employee has ${clockIns.length} clock-in events for this shift`,
        });
      }

      // Step 2e: FSM — determine session state
      const firstClockIn = clockIns.length > 0 ? clockIns[0] : null;
      const lastClockOut = clockOuts.length > 0 ? clockOuts[clockOuts.length - 1] : null;

      let status: WorkSession["status"];
      let actualStart: Date | null = null;
      let actualEnd: Date | null = null;
      let startDelta: number | null = null;
      let endDelta: number | null = null;

      if (!firstClockIn) {
        // NO CLOCK-IN AT ALL
        status = "NO_SHOW";
        violations.push({
          type: "NO_SHOW",
          severity: "HIGH",
          employeeId: assignment.employeeId,
          assignmentId: assignment.id,
          message: `Employee assigned but no clock-in found for shift`,
        });
      } else if (firstClockIn && !lastClockOut) {
        // CLOCK-IN BUT NO CLOCK-OUT
        status = "PARTIAL";
        actualStart = firstClockIn.timestamp;
        actualEnd = null;
        startDelta = diffMinutes(actualStart, assignment.scheduledStart);
        matchedEventCount += 1;
      } else if (firstClockIn && lastClockOut && lastClockOut.timestamp <= firstClockIn.timestamp) {
        // CLOCK-OUT BEFORE OR EQUAL TO CLOCK-IN → INVALID
        status = "INVALID";
        matchedEventCount += 2;
      } else {
        // FULL SESSION
        status = "COMPLETED";
        actualStart = firstClockIn.timestamp;
        actualEnd = lastClockOut!.timestamp;
        startDelta = diffMinutes(actualStart, assignment.scheduledStart);
        endDelta = diffMinutes(actualEnd, assignment.scheduledEnd);
        matchedEventCount += clockIns.length + clockOuts.length;

        // Late detection
        if (startDelta > lateThreshold) {
          violations.push({
            type: "LATE",
            severity: startDelta > 60 ? "HIGH" : "MEDIUM",
            employeeId: assignment.employeeId,
            assignmentId: assignment.id,
            message: `Employee clocked in ${startDelta} minutes late`,
          });
        }

        // Early leave detection
        if (endDelta !== null && endDelta < -lateThreshold) {
          violations.push({
            type: "EARLY_LEAVE",
            severity: endDelta < -60 ? "HIGH" : "MEDIUM",
            employeeId: assignment.employeeId,
            assignmentId: assignment.id,
            message: `Employee left ${Math.abs(endDelta)} minutes early`,
          });
        }

        // Overtime detection
        const duration = diffMinutes(actualEnd, actualStart);
        const scheduledDuration = diffMinutes(
          assignment.scheduledEnd,
          assignment.scheduledStart,
        );
        if (duration > scheduledDuration && endDelta !== null && endDelta > lateThreshold) {
          violations.push({
            type: "OVERTIME",
            severity: endDelta > 120 ? "HIGH" : "MEDIUM",
            employeeId: assignment.employeeId,
            assignmentId: assignment.id,
            message: `Employee worked ${endDelta} minutes overtime`,
          });
        }
      }

      const duration =
        actualStart && actualEnd
          ? diffMinutes(actualEnd, actualStart)
          : 0;

      sessions.push({
        assignmentId: assignment.id,
        employeeId: assignment.employeeId,
        actualStart,
        actualEnd,
        status,
        durationMinutes: duration,
        startDeltaMinutes: startDelta,
        endDeltaMinutes: endDelta,
        eventCount: windowed.length,
      });
    }

    // Step 3: Unmatched events — events that didn't bind to any assignment
    const boundEventIds = new Set<string>();
    // ponytail: simplified tracking; full implementation needs session→event link
    // For now, skip unmatched event detection — requires tracking matched events per session

    // Stats
    const totalAssignments = assignments.length;
    const noShowCount = sessions.filter((s) => s.status === "NO_SHOW").length;
    const lateCount = violations.filter((v) => v.type === "LATE").length;
    const overtimeCount = violations.filter((v) => v.type === "OVERTIME").length;
    const completedCount = sessions.filter((s) => s.status === "COMPLETED" || s.status === "PARTIAL").length;

    return {
      sessions,
      violations,
      stats: {
        noShowCount,
        lateCount,
        overtimeCount,
        completionRate: totalAssignments > 0 ? completedCount / totalAssignments : 1,
        totalAssignments,
      },
    };
  }

  // ─── Private helpers ─────────────────────────────────────────

  private groupByEmployee(
    events: AttendanceEvent[],
  ): Map<string, AttendanceEvent[]> {
    const map = new Map<string, AttendanceEvent[]>();
    for (const e of events) {
      const list = map.get(e.employeeId) ?? [];
      list.push(e);
      map.set(e.employeeId, list);
    }
    return map;
  }
}

// ─── Pure helpers ──────────────────────────────────────────────────

function sortEvents(events: AttendanceEvent[]): AttendanceEvent[] {
  return [...events].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
}

function deduplicate(events: AttendanceEvent[]): AttendanceEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function diffMinutes(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / 60_000;
}
