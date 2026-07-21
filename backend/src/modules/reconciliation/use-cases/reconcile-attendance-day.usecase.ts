import { Inject, Injectable } from "@nestjs/common";
import {
  ATTENDANCE_ASSIGNMENT_READER_PORT,
  AttendanceAssignmentReaderPort,
} from "../../../contracts/ports/attendance-assignment-reader.port";
import {
  RECONCILIATION_ATTENDANCE_READER_PORT,
  ReconciliationAttendanceReaderPort,
} from "../../../contracts/ports/reconciliation-attendance-reader.port";
import { AttendanceViolationEngine } from "../violation-engine/violation-engine";
import { AttendanceViolationsRepository } from "../repositories/attendance-violations.repository";
import { EventOutboxService } from "../../../core/events/event-outbox.service";
import { AttendanceViolationCreatedEvent } from "../events/attendance-violation-created.event";
import { ReconciliationContext } from "../violation-engine/interfaces";
import { ContextLogger } from "../../../shared/logging/context-logger";
import { RequestContextService } from "../../../shared/context/request-context.service";

@Injectable()
export class ReconcileAttendanceDayUseCase {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(ATTENDANCE_ASSIGNMENT_READER_PORT)
    private readonly assignmentReader: AttendanceAssignmentReaderPort,
    @Inject(RECONCILIATION_ATTENDANCE_READER_PORT)
    private readonly attendanceReader: ReconciliationAttendanceReaderPort,
    private readonly violationEngine: AttendanceViolationEngine,
    private readonly violationsRepo: AttendanceViolationsRepository,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ReconcileAttendanceDayUseCase.name);
  }

  async execute(employeeId: string, date: string, evaluationTime?: Date) {
    this.logger.log("Executing reconciliation for employee on date", { employeeId, date });


    // 1. Fetch cross-context assignment, sessions, and clock events
    const assignment = await this.assignmentReader.resolveTodayAssignment(employeeId, date);
    const sessions = await this.attendanceReader.findSessionsByEmployeeAndDate(employeeId, date);
    const clockEvents = await this.attendanceReader.findClockEventsByEmployeeAndDate(employeeId, date);

    const evaluatedAt = evaluationTime ?? new Date();

    const allViolations: any[] = [];

    // 2. Perform reconciliation transaction
    await this.violationsRepo.transaction(async (tx) => {
      for (const session of sessions) {
        // Construct the pure ReconciliationContext
        const context: ReconciliationContext = {
          assignment,
          session,
          clockEvents: clockEvents.filter((event) => event.sessionId === session.id),
          policy: {
            lateGraceMinutes: 15,
            earlyDepartureGraceMinutes: 15,
            overtimeMinMinutes: 30,
            allowUnscheduled: true,
          },
          evaluatedAt,
        };

        // Evaluate violation rules
        const evaluatedViolations = this.violationEngine.evaluate(context);

        // Prepare insertions
        const violationInserts = evaluatedViolations.map((v) => ({
          sessionId: session.id,
          employeeId: session.employeeId,
          code: v.code,
          severity: v.severity,
          status: v.status,
          autoResolvable: v.autoResolvable,
          requiresApproval: v.requiresApproval,
          metadata: v.metadata,
          detectedAt: evaluatedAt,
        }));

        // Replace existing violations for this session
        const persisted = await this.violationsRepo.replaceViolationsForSession(
          session.id,
          violationInserts,
          tx,
        );

        // Stage domain event for each created violation
        for (const violation of persisted) {
          await this.eventOutbox.stage(
            new AttendanceViolationCreatedEvent({
              violationId: violation.id,
              sessionId: violation.sessionId!,
              employeeId: violation.employeeId,
              code: violation.code,
              severity: violation.severity,
              status: violation.status,
            }),
            tx,
          );
        }

        allViolations.push(...persisted);
      }
    });

    return allViolations;
  }
}
