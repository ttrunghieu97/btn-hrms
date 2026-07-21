import { Inject, Injectable } from "@nestjs/common";
import { AttendanceEventRepository } from "../repositories/attendance-event.repository";
import { ViolationRepository } from "../repositories/violation.repository";
import { ReconciliationService, type AssignmentWindow } from "../reconciliation.service";
import {
  EMPLOYEE_SHIFT_READER_PORT,
  type EmployeeShiftReaderPort,
} from "../../../../contracts/ports/employee-shift-reader.port";

@Injectable()
export class ReconcileAttendanceDayUseCase {
  constructor(
    private readonly eventRepo: AttendanceEventRepository,
    private readonly violationRepo: ViolationRepository,
    private readonly reconciler: ReconciliationService,
    @Inject(EMPLOYEE_SHIFT_READER_PORT)
    private readonly shiftReader: EmployeeShiftReaderPort,
  ) {}

  async execute(date: string, employeeId?: string) {
    const dayStart = new Date(`${date}T00:00:00Z`);
    const dayEnd = new Date(`${date}T23:59:59Z`);

    const events = employeeId
      ? await this.eventRepo.findByEmployeeAndRange(employeeId, dayStart, dayEnd)
      : [];

    const assignments: AssignmentWindow[] = [];
    if (employeeId) {
      const shiftRows = await this.shiftReader.getEmployeeAssignmentsForRange(
        employeeId,
        date,
        date,
      );
      for (const s of shiftRows) {
        if (!s.shiftTemplate) continue;
        assignments.push({
          id: s.id,
          employeeId,
          shiftTemplateId: s.shiftTemplateId,
          scheduledStart: new Date(`${date}T${s.shiftTemplate.startTime}`),
          scheduledEnd: new Date(`${date}T${s.shiftTemplate.endTime}`),
        });
      }
    }

    const mappedEvents = events.map((e) => ({
      id: e.id,
      employeeId: e.employeeId,
      type: e.type,
      timestamp: e.timestamp,
      source: e.source,
      locationId: e.locationId,
    }));

    const result = this.reconciler.reconcile(mappedEvents, assignments);

    await this.violationRepo.persistViolations(date, result.violations);

    return {
      data: {
        date,
        employeeId: employeeId ?? null,
        eventCount: mappedEvents.length,
        assignmentCount: assignments.length,
        sessions: result.sessions,
        violations: result.violations,
        stats: result.stats,
      },
      error: null,
    };
  }
}
