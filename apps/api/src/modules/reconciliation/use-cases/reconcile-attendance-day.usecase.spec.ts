import { Test, type TestingModule } from "@nestjs/testing";
import { ReconcileAttendanceDayUseCase } from "./reconcile-attendance-day.usecase";
import { ATTENDANCE_ASSIGNMENT_READER_PORT } from "../../../contracts/ports/attendance-assignment-reader.port";
import { RECONCILIATION_ATTENDANCE_READER_PORT } from "../../../contracts/ports/reconciliation-attendance-reader.port";
import { AttendanceViolationEngine } from "../violation-engine/violation-engine";
import { AttendanceViolationsRepository } from "../repositories/attendance-violations.repository";
import { EventOutboxService } from "../../../core/events/event-outbox.service";
import { RequestContextService } from "../../../shared/context/request-context.service";

describe("ReconcileAttendanceDayUseCase", () => {
  let useCase: ReconcileAttendanceDayUseCase;
  let assignmentReaderMock: any;
  let attendanceReaderMock: any;
  let violationsRepoMock: any;
  let eventOutboxMock: any;

  beforeEach(async () => {
    assignmentReaderMock = {
      resolveTodayAssignment: jest.fn(),
    };

    attendanceReaderMock = {
      findSessionsByEmployeeAndDate: jest.fn(),
      findClockEventsByEmployeeAndDate: jest.fn(),
    };

    violationsRepoMock = {
      replaceViolationsForSession: jest.fn(),
      transaction: jest.fn((cb) => cb(null)),
    };

    eventOutboxMock = {
      stage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconcileAttendanceDayUseCase,
        AttendanceViolationEngine,
        {
          provide: ATTENDANCE_ASSIGNMENT_READER_PORT,
          useValue: assignmentReaderMock,
        },
        {
          provide: RECONCILIATION_ATTENDANCE_READER_PORT,
          useValue: attendanceReaderMock,
        },
        {
          provide: AttendanceViolationsRepository,
          useValue: violationsRepoMock,
        },
        {
          provide: EventOutboxService,
          useValue: eventOutboxMock,
        },
        {
          provide: RequestContextService,
          useValue: {
            get: jest.fn().mockReturnValue({ requestId: "test-req" }),
          },
        },
      ],
    }).compile();

    useCase = module.get<ReconcileAttendanceDayUseCase>(ReconcileAttendanceDayUseCase);
  });

  it("should reconcile sessions and stage violation events when rules trigger violations", async () => {
    const mockSession = {
      id: "session-1",
      employeeId: "emp-123",
      assignmentId: "assign-123",
      sessionType: "MORNING",
      status: "READY",
      date: "2026-07-09",
      timezone: "Asia/Ho_Chi_Minh",
      plannedStart: "08:00",
      plannedEnd: "12:00",
      actualStart: new Date("2026-07-09T01:25:00Z"), // 08:25 (late by 25 mins)
      actualEnd: new Date("2026-07-09T05:00:00Z"), // 12:00
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockAssignment = {
      assignmentId: "assign-123",
      shift: {
        id: "shift-1",
        startTime: "08:00",
        endTime: "12:00",
        isNightShift: false,
        breakMinutes: 0,
      },
      timezone: "Asia/Ho_Chi_Minh",
      assignmentSource: "ROSTER",
    };

    assignmentReaderMock.resolveTodayAssignment.mockResolvedValue(mockAssignment);
    attendanceReaderMock.findSessionsByEmployeeAndDate.mockResolvedValue([mockSession]);
    attendanceReaderMock.findClockEventsByEmployeeAndDate.mockResolvedValue([]);

    const mockPersistedViolation = {
      id: "violation-123",
      sessionId: "session-1",
      employeeId: "emp-123",
      code: "LATE_ARRIVAL",
      severity: "WARNING",
      status: "OPEN",
    };

    violationsRepoMock.replaceViolationsForSession.mockResolvedValue([mockPersistedViolation]);

    const result = await useCase.execute("emp-123", "2026-07-09", new Date("2026-07-09T10:00:00Z"));

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockPersistedViolation);

    // Verify outbox was staged
    expect(eventOutboxMock.stage).toHaveBeenCalledTimes(1);
    expect(eventOutboxMock.stage.mock.calls[0][0].eventType).toBe("attendance.violation.created.v1");
    expect(eventOutboxMock.stage.mock.calls[0][0].data).toEqual({
      violationId: "violation-123",
      sessionId: "session-1",
      employeeId: "emp-123",
      code: "LATE_ARRIVAL",
      severity: "WARNING",
      status: "OPEN",
    });
  });
});
