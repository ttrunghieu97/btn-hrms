import { ScheduleRequestsController } from "./schedule-requests.controller";
import { ScheduleRequestAuthorizationService } from "./services/schedule-request-authorization.service";
import { Permissions } from "../../../core/security/permissions/permissions.registry";

describe("ScheduleRequestsController & ScheduleRequestAuthorizationService — RBAC & Scope Isolation", () => {
  const createUseCase = { execute: jest.fn() };
  const listUseCase = { execute: jest.fn() };
  const reviewUseCase = { execute: jest.fn() };

  const controller = new ScheduleRequestsController(
    createUseCase as never,
    listUseCase as never,
    reviewUseCase as never,
  );
  const authService = new ScheduleRequestAuthorizationService();

  beforeEach(() => {
    jest.clearAllMocks();
    listUseCase.execute.mockResolvedValue([]);
  });

  describe("ScheduleRequestsController.list", () => {
    it("allows HR/Admin with schedule:view:all or sys:all to list all requests or filter by employeeId", async () => {
      await controller.list(
        {
          user: {
            id: "u-hr",
            employeeId: "emp-hr",
            permissions: [Permissions.SCHEDULE_VIEW_ALL],
          },
        } as never,
        "PENDING",
        "emp-target",
      );

      expect(listUseCase.execute).toHaveBeenCalledWith({
        status: "PENDING",
        employeeId: "emp-target",
      });

      listUseCase.execute.mockClear();

      await controller.list(
        {
          user: {
            id: "u-admin",
            employeeId: "emp-admin",
            permissions: [Permissions.SYS_ALL],
          },
        } as never,
        undefined,
        undefined,
      );

      expect(listUseCase.execute).toHaveBeenCalledWith({});
    });

    it("forces employeeId filter to caller's own employeeId for self-scoped employees", async () => {
      await controller.list(
        {
          user: {
            id: "u-emp",
            employeeId: "emp-self",
            permissions: [Permissions.SCHEDULE_VIEW_SELF],
          },
        } as never,
        "PENDING",
        "emp-other-victim",
      );

      expect(listUseCase.execute).toHaveBeenCalledWith({
        status: "PENDING",
        employeeId: "emp-self",
      });
    });

    it("fails closed with 403 Forbidden when self-scoped user has no linked employeeId", async () => {
      await expect(
        controller.list(
          {
            user: {
              id: "u-unlinked",
              employeeId: undefined,
              permissions: [Permissions.SCHEDULE_VIEW_SELF],
            },
          } as never,
          undefined,
          undefined,
        ),
      ).rejects.toThrow(/Employee profile|Forbidden/i);

      expect(listUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe("ScheduleRequestAuthorizationService.canReview", () => {
    const sampleRequest = {
      id: "req-1",
      employeeId: "emp-requester",
      requestType: "SHIFT_CHANGE",
      date: "2026-10-20",
      reason: "Doctor appointment",
      status: "PENDING",
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date(),
    };

    it("allows HR/Admin with schedule:edit:all or sys:all to review another employee's request", async () => {
      await expect(
        authService.canReview(
          {
            id: "u-hr",
            employeeId: "emp-hr",
            permissions: [Permissions.SCHEDULE_EDIT_ALL],
          } as never,
          sampleRequest as never,
        ),
      ).resolves.toBeUndefined();
    });

    it("rejects self-approval when actor's employeeId matches request.employeeId", async () => {
      await expect(
        authService.canReview(
          {
            id: "u-hr-self",
            employeeId: "emp-requester",
            permissions: [Permissions.SCHEDULE_EDIT_ALL],
          } as never,
          sampleRequest as never,
        ),
      ).rejects.toThrow(/own schedule request/i);
    });

    it("rejects users without schedule:edit:all or assigned reviewer match", async () => {
      await expect(
        authService.canReview(
          {
            id: "u-emp",
            employeeId: "emp-other",
            permissions: [Permissions.SCHEDULE_VIEW_SELF],
          } as never,
          sampleRequest as never,
        ),
      ).rejects.toThrow(/permission to review/i);
    });
  });
});
