import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../../../infrastructure/database/schema";
import { and, eq, inArray, desc } from "drizzle-orm";
import { EMPLOYEE_READER_PORT, type IEmployeeReader } from "../../../../contracts/ports/employee-reader.port";
import { EMPLOYEE_SHIFT_READER_PORT, type EmployeeShiftReaderPort } from "../../../../contracts/ports/employee-shift-reader.port";
import { LEAVE_READER_PORT, type ILeaveReaderPort } from "../../../../contracts/ports/leave-reader.port";
import { CLOCK_PORT, type ClockPort } from "../ports/clock.port";
import { PresenceQueryDto, PresenceStatus } from "../dto/presence-query.dto";

@Injectable()
export class GetEmployeesPresenceUseCase {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(EMPLOYEE_READER_PORT)
    private readonly employeeReader: IEmployeeReader,
    @Inject(EMPLOYEE_SHIFT_READER_PORT)
    private readonly shiftReader: EmployeeShiftReaderPort,
    @Inject(LEAVE_READER_PORT)
    private readonly leaveReader: ILeaveReaderPort,
    @Inject(CLOCK_PORT)
    private readonly clock: ClockPort,
  ) {}

  async execute(query: PresenceQueryDto) {
    const today = this.clock.today();
    const now = this.clock.now();

    // 1. Fetch active employees matching the query filter
    const employees = await this.employeeReader.findActiveEmployees(query.departmentId);
    if (!employees || employees.length === 0) {
      return { items: [] };
    }

    // Filter by employee IDs if specified
    let targetEmployees = employees;
    if (query.employeeIds) {
      const ids = query.employeeIds.split(",").map((id) => id.trim());
      targetEmployees = targetEmployees.filter((emp) => ids.includes(emp.id));
    }

    // Filter by location if specified
    if (query.locationId) {
      targetEmployees = targetEmployees.filter((emp) => emp.locationId === query.locationId);
    }

    if (targetEmployees.length === 0) {
      return { items: [] };
    }

    const employeeIds = targetEmployees.map((emp) => emp.id);

    // 2. Fetch all approved leave requests for these employees today
    const leaves = await this.leaveReader.findApprovedLeavesByEmployeeIds(employeeIds, today);
    const leaveByEmployeeId = new Map(leaves.map((l) => [l.employeeId, l]));

    // 3. Fetch today's shift assignments in bulk
    const assignments = await this.shiftReader.findAssignmentsByDate(employeeIds, today);
    const assignmentByEmployeeId = new Map(
      assignments.map((a) => [a.employeeId, a]),
    );

    // 4. Fetch today's attendance sessions to check status
    const sessions = await this.db
      .select()
      .from(schema.attendanceSessions)
      .where(
        and(
          eq(schema.attendanceSessions.date, today),
          inArray(schema.attendanceSessions.employeeId, employeeIds),
        ),
      );

    const sessionsByEmployeeId = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const list = sessionsByEmployeeId.get(s.employeeId) ?? [];
      list.push(s);
      sessionsByEmployeeId.set(s.employeeId, list);
    }

    // 5. Fetch all today's clock events to determine granular status (e.g. BREAK)
    const todayEvents = await this.db
      .select()
      .from(schema.attendances)
      .where(
        and(
          eq(schema.attendances.date, today),
          inArray(schema.attendances.employeeId, employeeIds),
        ),
      )
      .orderBy(desc(schema.attendances.time));

    const eventsByEmployeeId = new Map<string, typeof todayEvents>();
    for (const e of todayEvents) {
      const list = eventsByEmployeeId.get(e.employeeId) ?? [];
      list.push(e);
      eventsByEmployeeId.set(e.employeeId, list);
    }

    // 6. Map and derive presence status for each employee
    const items = targetEmployees.map((emp) => {
      let status = PresenceStatus.OFF_DUTY;
      let checkInAt: string | null = null;
      let workingDurationSeconds = 0;
      let currentSessionId: string | null = null;

      const empLeaves = leaveByEmployeeId.get(emp.id);
      const empAssignment = assignmentByEmployeeId.get(emp.id);
      const empSessions = sessionsByEmployeeId.get(emp.id) ?? [];
      const empEvents = eventsByEmployeeId.get(emp.id) ?? [];

      const activeSession = empSessions.find((s) => s.status === "IN_PROGRESS");
      const completedSessions = empSessions.filter((s) => s.status === "COMPLETED");

      // Calculate working duration from sessions
      for (const s of empSessions) {
        if (s.actualStart) {
          const start = new Date(s.actualStart).getTime();
          const end = s.actualEnd ? new Date(s.actualEnd).getTime() : now.getTime();
          if (end > start) {
            workingDurationSeconds += Math.floor((end - start) / 1000);
          }
        }
      }

      if (empLeaves) {
        status = PresenceStatus.LEAVE;
      } else if (activeSession) {
        currentSessionId = activeSession.id;
        checkInAt = activeSession.actualStart?.toISOString() ?? null;

        // Check if the most recent event is break_start
        const latestEvent = empEvents[0];
        if (latestEvent?.type === "break_start") {
          status = PresenceStatus.BREAK;
        } else {
          status = PresenceStatus.ACTIVE;
        }
      } else if (completedSessions.length > 0 && empSessions.every((s) => s.status !== "READY")) {
        // Shift completed
        status = PresenceStatus.OFF_DUTY;
      } else if (empAssignment) {
        // Has shift assignment but no check-in yet
        const startTime = empAssignment.shiftTemplate?.startTime ?? "09:00";
        const [sh, sm] = startTime.split(":").map(Number);
        const shiftStart = new Date(now);
        shiftStart.setHours(sh ?? 9, sm ?? 0, 0, 0);

        if (now.getTime() < shiftStart.getTime()) {
          status = PresenceStatus.UPCOMING;
        } else {
          status = PresenceStatus.ABSENT;
        }
      }

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        fullName: `${emp.firstName} ${emp.lastName}`.trim(),
        avatar: emp.avatarFileId ?? null,
        departmentName: emp.department?.name ?? null,
        position:
          emp.orgAssignments?.find((assignment: any) => assignment.isCurrent)?.jobTitle ?? null,
        status,
        sessionId: currentSessionId,
        checkInAt,
        workingDurationSeconds,
        shiftId: empAssignment?.id ?? null,
        shiftName: empAssignment?.shiftTemplate?.name ?? null,
      };
    });

    // Filter by status if specified in query
    let filteredItems = items;
    if (query.status) {
      filteredItems = filteredItems.filter((item) => item.status === query.status);
    }

    return { items: filteredItems };
  }

  async getSummary(query: PresenceQueryDto) {
    const { items } = await this.execute(query);
    const summary = {
      active: 0,
      break: 0,
      upcoming: 0,
      offDuty: 0,
      leave: 0,
      absent: 0,
    };

    for (const item of items) {
      if (item.status === PresenceStatus.ACTIVE) summary.active++;
      else if (item.status === PresenceStatus.BREAK) summary.break++;
      else if (item.status === PresenceStatus.UPCOMING) summary.upcoming++;
      else if (item.status === PresenceStatus.OFF_DUTY) summary.offDuty++;
      else if (item.status === PresenceStatus.LEAVE) summary.leave++;
      else if (item.status === PresenceStatus.ABSENT) summary.absent++;
    }

    return summary;
  }
}
