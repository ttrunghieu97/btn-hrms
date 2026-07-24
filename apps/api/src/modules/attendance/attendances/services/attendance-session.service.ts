import { Injectable, Inject } from "@nestjs/common";
import { AttendanceSessionRepository } from "../repositories/attendance-session.repository";
import { CLOCK_PORT, type ClockPort } from "../ports/clock.port";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { throwBadRequest, throwConflict } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

type PunchType = "check_in" | "check_out" | "break_start" | "break_end" | "note";
type SessionType = "MORNING" | "AFTERNOON" | "LUNCH_DUTY" | "NIGHT" | "OT";
type SessionStatus = "READY" | "IN_PROGRESS" | "COMPLETED" | "MISSED" | "CANCELLED";

const SESSION_TYPE_MAP: Record<string, SessionType> = {
  morning: "MORNING",
  noon: "LUNCH_DUTY",
  afternoon: "AFTERNOON",
};

/**
 * Allowed state transitions for AttendanceSession lifecycle.
 * Any transition not listed here is invalid.
 */
const ALLOWED_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  READY: ["IN_PROGRESS", "CANCELLED", "MISSED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [], // terminal
  MISSED: [],   // terminal
  CANCELLED: [], // terminal
};

@Injectable()
export class AttendanceSessionService {
  constructor(
    private readonly sessionRepo: AttendanceSessionRepository,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * Execute a state transition with enforcement.
   * Throws if the transition is not allowed.
   */
  private assertTransition(
    currentStatus: SessionStatus,
    targetStatus: SessionStatus,
    sessionId: string,
  ): void {
    const allowed = ALLOWED_TRANSITIONS[currentStatus];
    if (!allowed?.includes(targetStatus)) {
      throwBadRequest(
        `Cannot transition session from ${currentStatus} to ${targetStatus}`,
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        { sessionId, currentStatus, targetStatus },
      );
    }
  }

  /**
   * Resolve session for a punch event.
   * Phase 2C: create session on-the-fly if none exists.
   * Phase 3+: sessions are pre-created from Assignment Port.
   */
  async resolveSession(
    employeeId: string,
    date: string,
    sessionLabel: "morning" | "noon" | "afternoon",
    punchType: PunchType,
    tx?: AppDatabase,
  ) {
    const sessionType = SESSION_TYPE_MAP[sessionLabel] ?? "MORNING";

    if (punchType === "check_in") {
      // Before starting a new session, complete any existing active session
      // to avoid violating uq_attendance_active_session (only one IN_PROGRESS per employee).
      const activeSession = await this.sessionRepo.findActiveSession(employeeId, date, tx);
      if (activeSession) {
        if (activeSession.date !== date || activeSession.sessionType !== sessionType) {
          this.assertTransition(activeSession.status, "COMPLETED", activeSession.id);
          await this.sessionRepo.updateStatus(
            activeSession.id, "COMPLETED",
            { actualEnd: this.clock.now() }, tx,
          );
        } else {
          // Already in progress for this type and date
          return { sessionId: activeSession.id, sessionType };
        }
      }

      let session = await this.sessionRepo.findByEmployeeAndType(
        employeeId, date, sessionType, tx,
      );

      if (session && (session.status === "COMPLETED" || session.status === "MISSED" || session.status === "CANCELLED")) {
        throwConflict(
          `Session ${sessionType} is already ${session.status}`,
          ERROR_CODES.ATTENDANCE_ALREADY_RECORDED,
          { sessionId: session.id, status: session.status }
        );
      }

      if (!session) {
        session = await this.sessionRepo.create({
          employeeId,
          sessionType,
          date,
          status: "READY",
        }, tx);
      }

      if (session.status === "READY") {
        this.assertTransition(session.status, "IN_PROGRESS", session.id);
        const now = this.clock.now();
        await this.sessionRepo.updateStatus(
          session.id, "IN_PROGRESS",
          { actualStart: now }, tx,
        );
      }

      return { sessionId: session.id, sessionType };
    }

    if (punchType === "check_out") {
      const active = await this.sessionRepo.findByEmployeeAndType(
        employeeId, date, sessionType, tx,
      );
      if (active?.status === "IN_PROGRESS") {
        this.assertTransition(active.status, "COMPLETED", active.id);
        const now = this.clock.now();
        await this.sessionRepo.updateStatus(
          active.id, "COMPLETED",
          { actualEnd: now }, tx,
        );
        return { sessionId: active.id, sessionType };
      }
      // Fallback: any active session
      const fallback = await this.sessionRepo.findActiveSession(employeeId, date, tx);
      if (fallback) {
        this.assertTransition(fallback.status, "COMPLETED", fallback.id);
        const now = this.clock.now();
        await this.sessionRepo.updateStatus(
          fallback.id, "COMPLETED",
          { actualEnd: now }, tx,
        );
        return { sessionId: fallback.id, sessionType: fallback.sessionType };
      }
    }

    // break_start / break_end / note: find active session, no state transition
    const active = await this.sessionRepo.findActiveSession(employeeId, date, tx);
    if (active) {
      return { sessionId: active.id, sessionType: active.sessionType };
    }

    return { sessionId: null, sessionType };
  }
}
