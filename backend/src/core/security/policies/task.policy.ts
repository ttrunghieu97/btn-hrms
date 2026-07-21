import type { AuthUser } from "../types/auth-user.interface";
import type { PolicyHandler } from "./policy-handler.interface";
import { Permissions } from "../permissions/permissions.registry";

interface TaskPolicyResource {
  assigneeId?: unknown;
  departmentId?: unknown;
  assignee?: {
    departmentId?: unknown;
  } | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toTaskResource(value: unknown): TaskPolicyResource | null {
  if (!isRecord(value)) return null;

  const assignee = value.assignee;
  return {
    assigneeId: value.assigneeId,
    departmentId: value.departmentId,
    assignee: isRecord(assignee)
      ? { departmentId: assignee.departmentId }
      : null,
  };
}

function hasGlobalAccess(user: AuthUser): boolean {
  return (
    user.isSuperAdmin === true ||
    user.permissions.includes(Permissions.SYS_ALL)
  );
}

class ViewTaskPolicyHandler implements PolicyHandler {
  readonly policyName = "ViewTask";
  readonly requiredAnyOfPermissions = [Permissions.TASKS_VIEW];

  handle(user: AuthUser): boolean {
    return (
      hasGlobalAccess(user) ||
      user.permissions.includes(Permissions.TASKS_VIEW)
    );
  }
}

class ViewOwnTaskPolicyHandler implements PolicyHandler {
  readonly policyName = "ViewOwnTask";

  handle(user: AuthUser, resource?: unknown): boolean {
    if (
      hasGlobalAccess(user) ||
      user.permissions.includes(Permissions.TASKS_VIEW)
    ) {
      return true;
    }

    const task = toTaskResource(resource);
    if (
      task?.assigneeId &&
      user.employeeId &&
      String(task.assigneeId) === String(user.employeeId)
    ) {
      return true;
    }

    return user.permissions.includes(Permissions.TASKS_VIEW_SELF);
  }
}

class CreateTaskPolicyHandler implements PolicyHandler {
  readonly policyName = "CreateTask";
  readonly requiredAnyOfPermissions = [Permissions.TASKS_CREATE];

  handle(user: AuthUser): boolean {
    return (
      hasGlobalAccess(user) ||
      user.permissions.includes(Permissions.TASKS_CREATE)
    );
  }
}

class UpdateTaskPolicyHandler implements PolicyHandler {
  readonly policyName = "UpdateTask";

  handle(user: AuthUser, resource?: unknown): boolean {
    if (
      hasGlobalAccess(user) ||
      user.permissions.includes(Permissions.TASKS_EDIT)
    ) {
      return true;
    }

    const task = toTaskResource(resource);
    return Boolean(
      task?.assigneeId &&
        user.employeeId &&
        String(task.assigneeId) === String(user.employeeId),
    );
  }
}

class ManageTaskPolicyHandler implements PolicyHandler {
  readonly policyName = "ManageTask";
  readonly requiredAnyOfPermissions = [
    Permissions.TASKS_EDIT,
    Permissions.TASKS_ASSIGN,
  ];

  handle(user: AuthUser, resource?: unknown): boolean {
    if (hasGlobalAccess(user)) return true;

    const hasPermission =
      user.permissions.includes(Permissions.TASKS_EDIT) ||
      user.permissions.includes(Permissions.TASKS_ASSIGN);
    if (!hasPermission) return false;

    const task = toTaskResource(resource);
    const assigneeDepartmentId =
      task?.departmentId ?? task?.assignee?.departmentId;
    if (
      assigneeDepartmentId &&
      user.departmentId &&
      String(assigneeDepartmentId) !== String(user.departmentId)
    ) {
      return false;
    }

    return true;
  }
}

class DeleteTaskPolicyHandler implements PolicyHandler {
  readonly policyName = "DeleteTask";
  readonly requiredAnyOfPermissions = [Permissions.TASKS_DELETE];

  handle(user: AuthUser): boolean {
    return (
      hasGlobalAccess(user) ||
      user.permissions.includes(Permissions.TASKS_DELETE)
    );
  }
}

class AssignTaskPolicyHandler implements PolicyHandler {
  readonly policyName = "AssignTask";
  readonly requiredAnyOfPermissions = [Permissions.TASKS_ASSIGN];

  handle(user: AuthUser): boolean {
    return (
      hasGlobalAccess(user) ||
      user.permissions.includes(Permissions.TASKS_ASSIGN)
    );
  }
}

export const TaskPolicies = {
  viewAny: new ViewTaskPolicyHandler(),
  viewOwn: new ViewOwnTaskPolicyHandler(),
  create: new CreateTaskPolicyHandler(),
  update: new UpdateTaskPolicyHandler(),
  manage: new ManageTaskPolicyHandler(),
  delete: new DeleteTaskPolicyHandler(),
  assign: new AssignTaskPolicyHandler(),
} as const;
