import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import { EMPLOYEE_STATUS_TRANSITIONS } from "../constants/employee-transitions";

type EmployeeStatus = keyof typeof EMPLOYEE_STATUS_TRANSITIONS;

export type EmployeeLifecycleOperation =
  | "change_status"
  | "schedule_termination"
  | "execute_termination"
  | "request_transfer"
  | "apply_transfer"
  | "restore_archive"
  | "rehire";

export interface EmployeeLifecycleResource {
  id: string;
  status?: string | null;
  deletedAt?: Date | string | null;
}

export interface EmployeeLifecycleContext {
  toStatus?: string;
}

const TERMINAL_STATUSES = new Set(["terminated", "retired"]);

function fail(message: string, details: Record<string, unknown>) {
  throwBadRequest(message, ERROR_CODES.INVALID_REQUEST, {
    reason: ERROR_REASONS.INVALID_STATE,
    ...details,
  });
}

export function assertStatusTransition(fromStatus: string, toStatus: string) {
  if (fromStatus === toStatus) {
    fail("Employee already has this status", { currentStatus: fromStatus });
  }

  if (toStatus === "terminated") {
    fail("Use termination workflow to terminate an employee", { toStatus });
  }

  const allowed = EMPLOYEE_STATUS_TRANSITIONS[fromStatus];
  if (!allowed?.includes(toStatus)) {
    fail(`Cannot change status from "${fromStatus}" to "${toStatus}"`, {
      fromStatus,
      toStatus,
      allowedTransitions: allowed ?? [],
    });
  }
}

export function assertLifecycleOperation(
  operation: EmployeeLifecycleOperation,
  employee: EmployeeLifecycleResource,
  context: EmployeeLifecycleContext = {},
) {
  const status = employee.status ?? "";

  switch (operation) {
    case "change_status":
      if (employee.deletedAt) {
        fail("Cannot change status of archived employee", {
          employeeId: employee.id,
        });
      }
      if (!context.toStatus) {
        fail("Target status is required", { employeeId: employee.id });
      }
      assertStatusTransition(status, context.toStatus ?? "");
      return;

    case "schedule_termination":
    case "execute_termination":
      if (employee.deletedAt) {
        fail("Cannot terminate archived employee", { employeeId: employee.id });
      }
      if (status === "terminated") {
        fail("Employee already terminated", { employeeId: employee.id });
      }
      return;

    case "request_transfer":
    case "apply_transfer":
      if (employee.deletedAt) {
        fail("Cannot transfer archived employee", { employeeId: employee.id });
      }
      if (TERMINAL_STATUSES.has(status)) {
        fail("Cannot transfer terminal employee", {
          employeeId: employee.id,
          status,
        });
      }
      return;

    case "restore_archive":
      if (!employee.deletedAt) {
        fail("Employee is not archived", { employeeId: employee.id });
      }
      return;

    case "rehire":
      if (status !== "terminated") {
        fail("Only terminated employees can be rehired", {
          employeeId: employee.id,
          status,
        });
      }
      return;
  }
}
