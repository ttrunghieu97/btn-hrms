import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { ReconcileAttendanceDayUseCase } from "../../../modules/attendance/reconciliation/use-cases/reconcile-attendance-day.usecase";
import { ReconciliationService } from "../../../modules/attendance/reconciliation/reconciliation.service";
import { ViolationRepository } from "../../../modules/attendance/reconciliation/repositories/violation.repository";
import { AttendanceViolationsRepository } from "../../../modules/reconciliation/repositories/attendance-violations.repository";
import { LeavePolicies } from "../policies/leave.policy";
import { LeaveAuthorizationService } from "../../../modules/leave/leave-management/services/leave-authorization.service";
import { ListLeaveRequestsUseCase } from "../../../modules/leave/leave-management/use-cases/list-leave-requests.usecase";
import { GetLeaveRequestUseCase } from "../../../modules/leave/leave-management/use-cases/get-leave-request.usecase";
import { UsersRepository } from "../../../modules/identity/users/repositories/users.repository";
import { AttendanceEvidenceService } from "../../../modules/attendance/attendances/services/attendance-evidence.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { InboundAdapterController } from "../../../modules/integration-hub/inbound-adapter.controller";
import { Permissions } from "../permissions/permissions.registry";
import type { AuthUser } from "../types/auth-user.interface";

function makeActor(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "user-1",
    userId: "user-1",
    username: "emp1",
    employeeId: "emp-1",
    departmentId: "dept-1",
    permissions: [],
    roles: ["employee"],
    isSuperAdmin: false,
    scopeId: "company:default",
    ...overrides,
  };
}

describe("Phase 5C — Data Integrity & Security Hardening Regression Suite", () => {
  describe("BIZ-002: Whole-company attendance reconciliation when employeeId is omitted", () => {
    it("reconciles all active shift assignments and events across employees when employeeId is omitted", async () => {
      const eventRepo = {
        findByEmployeeAndRange: jest.fn(),
        findByEmployeeIdsAndRange: jest.fn().mockResolvedValue([
          {
            id: "ev-1",
            employeeId: "emp-1",
            type: "CLOCK_IN",
            timestamp: new Date("2026-06-25T08:05:00Z"),
            source: "DEVICE",
            locationId: null,
          },
          {
            id: "ev-2",
            employeeId: "emp-1",
            type: "CLOCK_OUT",
            timestamp: new Date("2026-06-25T17:00:00Z"),
            source: "DEVICE",
            locationId: null,
          },
        ]),
      };
      const violationRepo = {
        persistViolations: jest.fn().mockResolvedValue(undefined),
      };
      const shiftReader = {
        getEmployeeAssignmentsForRange: jest.fn(),
        findShiftAssignmentForEmployeeDay: jest.fn(),
        findAssignmentsByDate: jest.fn(),
        getAllAssignmentsForRange: jest.fn().mockResolvedValue([
          {
            id: "asgn-1",
            employeeId: "emp-1",
            shiftTemplateId: "tpl-1",
            assignmentDate: "2026-06-25",
            effectiveFrom: "2026-06-01",
            effectiveTo: null,
            status: "active",
            shiftTemplate: {
              name: "Standard Day",
              startTime: "08:00:00Z",
              endTime: "17:00:00Z",
              isNightShift: false,
              breakMinutes: 60,
            },
          },
          {
            id: "asgn-2",
            employeeId: "emp-2",
            shiftTemplateId: "tpl-1",
            assignmentDate: "2026-06-25",
            effectiveFrom: "2026-06-01",
            effectiveTo: null,
            status: "active",
            shiftTemplate: {
              name: "Standard Day",
              startTime: "08:00:00Z",
              endTime: "17:00:00Z",
              isNightShift: false,
              breakMinutes: 60,
            },
          },
        ]),
      };

      const useCase = new ReconcileAttendanceDayUseCase(
        eventRepo as any,
        violationRepo as any,
        new ReconciliationService(),
        shiftReader as any,
      );

      const res = await useCase.execute("2026-06-25");

      expect(shiftReader.getAllAssignmentsForRange).toHaveBeenCalledWith(
        "2026-06-25",
        "2026-06-25",
      );
      expect(res.data.assignmentCount).toBe(2);
      expect(res.data.sessions).toHaveLength(2);
      // emp-1 completed, emp-2 was a NO_SHOW
      expect(res.data.violations.some((v) => v.employeeId === "emp-2" && v.type === "NO_SHOW")).toBe(
        true,
      );
      expect(violationRepo.persistViolations).toHaveBeenCalledWith(
        "2026-06-25",
        res.data.violations,
      );
    });
  });

  describe("BIZ-003: Idempotent violation persistence on repeated reconciliation runs", () => {
    it("does not insert duplicate violation rows when persistViolations is called repeatedly for the same date", async () => {
      const storedRows: any[] = [];
      const mockDb = {
        query: {
          attendanceViolations: {
            findMany: jest.fn(async () => [...storedRows]),
          },
        },
        insert: jest.fn(() => ({
          values: jest.fn((rows: any[]) => {
            storedRows.push(...rows);
            return {
              onConflictDoNothing: jest.fn().mockResolvedValue(rows),
            };
          }),
        })),
      };

      const scopedDb = {
        getDb: () => mockDb,
      };

      const repo = new ViolationRepository(scopedDb as any);
      const violations = [
        {
          employeeId: "emp-2",
          assignmentId: "asgn-2",
          type: "NO_SHOW" as const,
          severity: "HIGH" as const,
          message: "Employee did not show up",
        },
      ];

      await repo.persistViolations("2026-06-25", violations);
      expect(storedRows).toHaveLength(1);

      // Re-running reconciliation for the exact same date & violation must be a no-op
      await repo.persistViolations("2026-06-25", violations);
      expect(storedRows).toHaveLength(1);
    });

    it("preserves RESOLVED and WAIVED violations when replaceViolationsForSession runs", async () => {
      const resolvedRow = {
        id: "viol-1",
        sessionId: "sess-1",
        employeeId: "emp-1",
        code: "LATE",
        severity: "WARNING",
        status: "RESOLVED",
      };
      const mockDb = {
        delete: jest.fn(() => ({
          where: jest.fn().mockResolvedValue(undefined),
        })),
        query: {
          attendanceViolations: {
            findMany: jest.fn().mockResolvedValue([resolvedRow]),
          },
        },
        insert: jest.fn(() => ({
          values: jest.fn(() => ({
            onConflictDoNothing: jest.fn(() => ({
              returning: jest.fn().mockResolvedValue([]),
            })),
          })),
        })),
      };

      const repo = new AttendanceViolationsRepository(mockDb as any);
      const result = await repo.replaceViolationsForSession("sess-1", [
        {
          sessionId: "sess-1",
          employeeId: "emp-1",
          code: "LATE",
          severity: "WARNING",
          status: "OPEN",
        } as any,
      ]);

      // Because LATE is already RESOLVED for sess-1, it is preserved and not re-inserted as OPEN
      expect(result).toEqual([resolvedRow]);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe("SEC-003: Leave request viewing authorization and scoping", () => {
    it("permits leave:view:self, leave:view:department, and leave:view:all in LeavePolicies.view", () => {
      expect(
        LeavePolicies.view.handle(
          makeActor({ permissions: [Permissions.LEAVE_VIEW_SELF] }),
        ),
      ).toBe(true);
      expect(
        LeavePolicies.view.handle(
          makeActor({ permissions: [Permissions.LEAVE_VIEW_DEPARTMENT] }),
        ),
      ).toBe(true);
      expect(
        LeavePolicies.view.handle(
          makeActor({ permissions: [Permissions.LEAVE_VIEW_ALL] }),
        ),
      ).toBe(true);
      expect(
        LeavePolicies.view.handle(makeActor({ permissions: [] })),
      ).toBe(false);
    });

    it("permits leave:request in LeavePolicies.create for baseline employees", () => {
      expect(
        LeavePolicies.create.handle(
          makeActor({ permissions: ["leave:request"] }),
        ),
      ).toBe(true);
    });

    it("enforces self and department scoping in ListLeaveRequestsUseCase", async () => {
      const repo = {
        list: jest.fn().mockResolvedValue({
          rows: [],
          total: 0,
          page: 1,
          limit: 20,
        }),
      };
      const reqCtx = { getRequestId: () => "req-1" };
      const useCase = new ListLeaveRequestsUseCase(
        repo as any,
        reqCtx as any,
        new LeaveAuthorizationService(),
      );

      // 1. Self-scoped employee attempting to query another employeeId is forced to their own employeeId
      const selfActor = makeActor({
        employeeId: "emp-self",
        permissions: [Permissions.LEAVE_VIEW_SELF],
      });
      await useCase.execute({ page: 1, limit: 20, employeeId: "emp-other" }, selfActor);
      expect(repo.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ employeeId: "emp-self" }),
        { tier: "self", employeeId: "emp-self" },
      );

      // 2. Department manager is scoped to their departmentId
      const deptActor = makeActor({
        employeeId: "emp-mgr",
        departmentId: "dept-eng",
        permissions: [Permissions.LEAVE_VIEW_DEPARTMENT],
      });
      await useCase.execute({ page: 1, limit: 20 }, deptActor);
      expect(repo.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, limit: 20 }),
        { tier: "department", departmentId: "dept-eng" },
      );
    });

    it("enforces object-level authorization in GetLeaveRequestUseCase", async () => {
      const repo = {
        findById: jest.fn().mockResolvedValue({
          id: "lr-1",
          employeeId: "emp-other",
          leaveTypeId: "lt-1",
          startDate: "2026-07-01",
          endDate: "2026-07-02",
          totalHours: "16",
          status: "PENDING",
          employee: {
            id: "emp-other",
            firstName: "Jane",
            lastName: "Doe",
            departmentId: "dept-sales",
          },
          leaveType: { id: "lt-1", name: "Annual Leave" },
        }),
      };
      const reqCtx = { getRequestId: () => "req-1" };
      const useCase = new GetLeaveRequestUseCase(
        repo as any,
        reqCtx as any,
        new LeaveAuthorizationService(),
      );

      const selfActor = makeActor({
        employeeId: "emp-self",
        permissions: [Permissions.LEAVE_VIEW_SELF],
      });
      await expect(useCase.execute("lr-1", selfActor)).rejects.toThrow(
        "You can only view your own leave requests",
      );

      const otherDeptManager = makeActor({
        employeeId: "emp-mgr",
        departmentId: "dept-eng",
        permissions: [Permissions.LEAVE_VIEW_DEPARTMENT],
      });
      await expect(useCase.execute("lr-1", otherDeptManager)).rejects.toThrow(
        "You can only view leave requests within your department",
      );

      const sameDeptManager = makeActor({
        employeeId: "emp-sales-mgr",
        departmentId: "dept-sales",
        permissions: [Permissions.LEAVE_VIEW_DEPARTMENT],
      });
      const dto = await useCase.execute("lr-1", sameDeptManager);
      expect(dto.id).toBe("lr-1");
    });
  });

  describe("BIZ-006 (SEC-005): Prevent user deletion from wiping linked employee profile", () => {
    it("throws 409 Conflict when attempting to delete a user linked to an employee record", async () => {
      const mockDb = {
        query: {
          employees: {
            findFirst: jest.fn().mockResolvedValue({
              id: "emp-100",
              employeeCode: "EMP-100",
            }),
          },
        },
        delete: jest.fn(),
      };

      const repo = new UsersRepository(mockDb as any);
      await expect(repo.delete("user-100")).rejects.toThrow(
        "Cannot delete user account linked to an employee profile; deactivate the user instead",
      );
      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });

  describe("SEC-004: Configurable strict face presence policy on attendance selfies", () => {
    const originalStrict = process.env.ATTENDANCE_STRICT_FACE_DETECTION;

    afterEach(() => {
      process.env.ATTENDANCE_STRICT_FACE_DETECTION = originalStrict;
    });

    it("rejects selfie when no face is detected and ATTENDANCE_STRICT_FACE_DETECTION=true", async () => {
      process.env.ATTENDANCE_STRICT_FACE_DETECTION = "true";

      const service = new AttendanceEvidenceService(
        { get: () => ({ userId: "user-1" }) } as any,
        { validate: () => ({ ok: true, mime: "image/jpeg" }) } as any,
        { detect: async () => ({ facePresent: false }) } as any,
        { store: jest.fn() } as any,
        {
          observeAttendanceVerificationStep: jest.fn(),
          incrementAttendanceFaceFail: jest.fn(),
          observeAttendanceUploadDuration: jest.fn(),
        } as any,
      );

      await expect(
        service.process({
          employeeId: "emp-1",
          buffer: Buffer.from("fake"),
          mime: "image/jpeg",
        }),
      ).rejects.toThrow("Selfie rejected: no face detected");
    });
  });

  describe("SEC-006: Cookie-authenticated state-changing request CSRF protection", () => {
    function makeGuard() {
      const jwtService = {
        verifyAsync: jest.fn().mockResolvedValue({
          sub: "user-1",
          email: "emp1@company.local",
          azv: 1,
        }),
      } as unknown as JwtService;
      const permissionReader = {
        getPermissions: jest.fn().mockResolvedValue([]),
      };
      const authSessionReader = {
        loadAuthSession: jest.fn().mockResolvedValue({
          user: {
            id: "user-1",
            username: "emp1",
            isSuperAdmin: false,
            authorizationVersion: 1,
          },
          employee: { id: "emp-1", departmentId: "dept-1" },
        }),
        isAuthUserActive: jest.fn().mockResolvedValue(true),
      };
      const configService = {
        get: jest.fn((key: string) => {
          if (key === "CORS_ORIGIN") return "https://hrms.company.local";
          if (key === "AUTH_JWT_SECRET") return "secret";
          return undefined;
        }),
      } as unknown as ConfigService;
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(false),
      } as unknown as Reflector;
      const rolesRepo = {
        findRoleContextByUserId: jest
          .fn()
          .mockResolvedValue({ roleNames: ["employee"], permissions: [] }),
      };
      const hierarchyResolver = {
        expand: jest.fn((p: string[]) => p),
      };

      return new JwtAuthGuard(
        jwtService,
        permissionReader as any,
        authSessionReader as any,
        configService,
        reflector,
        rolesRepo as any,
        hierarchyResolver as any,
      );
    }

    function makeContext(req: Record<string, unknown>): ExecutionContext {
      return {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => req,
        }),
      } as unknown as ExecutionContext;
    }

    it("blocks cookie-authenticated POST request when Sec-Fetch-Site is cross-site", async () => {
      const guard = makeGuard();
      const ctx = makeContext({
        method: "POST",
        headers: {
          cookie: "access_token=jwt-cookie-token",
          "sec-fetch-site": "cross-site",
        },
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        "Cross-site cookie-authenticated mutation blocked (CSRF protection)",
      );
    });

    it("blocks cookie-authenticated POST request when Origin does not match allowed origins", async () => {
      const guard = makeGuard();
      const ctx = makeContext({
        method: "POST",
        headers: {
          cookie: "access_token=jwt-cookie-token",
          host: "api.company.local",
          origin: "https://evil.example",
        },
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        "Cross-origin cookie-authenticated mutation blocked (CSRF protection)",
      );
    });

    it("allows cookie-authenticated POST request from configured CORS_ORIGIN", async () => {
      const guard = makeGuard();
      const ctx = makeContext({
        method: "POST",
        headers: {
          cookie: "access_token=jwt-cookie-token",
          host: "api.company.local",
          origin: "https://hrms.company.local",
        },
      });

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });
  });

  describe("SEC-007: Inbound webhook fail-closed when WEBHOOK_SECRET is unset", () => {
    const originalSecret = process.env.WEBHOOK_SECRET;

    afterEach(() => {
      process.env.WEBHOOK_SECRET = originalSecret;
    });

    it("rejects webhook ingestion when WEBHOOK_SECRET is empty or unset", async () => {
      process.env.WEBHOOK_SECRET = "   ";
      const controller = new InboundAdapterController();
      await expect(
        controller.ingest("generic", "sha256=anything", { ping: true }),
      ).rejects.toThrow("Inbound webhook secret is not configured");
    });
  });
});
