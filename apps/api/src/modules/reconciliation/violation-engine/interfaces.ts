import type { CurrentAssignment } from "../../../contracts/ports/attendance-assignment-reader.port";

export interface AttendanceSession {
  id: string;
  employeeId: string;
  assignmentId?: string | null;
  sessionType: string;
  status: string;
  date: string;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  actualStart?: Date | string | null;
  actualEnd?: Date | string | null;
  timezone?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ClockEvent {
  id: string;
  employeeId: string;
  sessionId?: string | null;
  type: string;
  time: Date | string;
  date: string;
}

export interface AttendancePolicy {
  lateGraceMinutes?: number;
  earlyDepartureGraceMinutes?: number;
  allowUnscheduled?: boolean;
  overtimeMinMinutes?: number;
}

export interface ReconciliationContext {
  assignment: CurrentAssignment | null;
  session: AttendanceSession;
  clockEvents: ClockEvent[];
  policy: AttendancePolicy;
  evaluatedAt: Date;
}

export interface AttendanceViolation {
  code: string;
  severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  status: "OPEN" | "RESOLVED" | "WAIVED";
  autoResolvable: boolean;
  requiresApproval: boolean;
  metadata?: Record<string, any>;
}

export interface AttendanceViolationRule {
  evaluate(context: ReconciliationContext): AttendanceViolation[];
}
