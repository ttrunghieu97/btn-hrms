import type { AuthUser } from "../types/auth-user.interface";
import { Permissions } from "../permissions/permissions.registry";
import { TaskPolicies } from "./task.policy";

function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "user-1",
    username: "user",
    departmentId: "department-1",
    permissions: [],
    roles: [],
    ...overrides,
  };
}

describe("TaskPolicies", () => {
  it("allows assignees to view and update their own task", () => {
    const actor = user({ employeeId: "employee-1", permissions: [Permissions.TASKS_VIEW_SELF] });
    const task = { assigneeId: "employee-1" };

    expect(TaskPolicies.viewOwn.handle(actor, task)).toBe(true);
    expect(TaskPolicies.update.handle(actor, task)).toBe(true);
  });

  it("denies ownership policies for a different assignee even if actor has TASKS_VIEW_SELF (BOLA prevention)", () => {
    const actor = user({
      id: "user-1",
      employeeId: "employee-1",
      permissions: [Permissions.TASKS_VIEW_SELF],
    });
    const task = { assigneeId: "employee-2", createdByUserId: "user-2" };

    expect(TaskPolicies.viewOwn.handle(actor, task)).toBe(false);
    expect(TaskPolicies.update.handle(actor, task)).toBe(false);
  });

  it("allows task creator to view and update the task", () => {
    const actor = user({
      id: "user-creator",
      employeeId: "employee-creator",
      permissions: [Permissions.TASKS_VIEW_SELF],
    });
    const task = { assigneeId: "employee-other", createdByUserId: "user-creator" };

    expect(TaskPolicies.viewOwn.handle(actor, task)).toBe(true);
    expect(TaskPolicies.update.handle(actor, task)).toBe(true);
  });

  it("allows users with global TASKS_VIEW to view other assignees' tasks", () => {
    const actor = user({
      employeeId: "employee-1",
      permissions: [Permissions.TASKS_VIEW],
    });
    const task = { assigneeId: "employee-2" };

    expect(TaskPolicies.viewOwn.handle(actor, task)).toBe(true);
  });

  it("allows self-scoped task listing with the self permission when no resource is passed", () => {
    const actor = user({
      permissions: [Permissions.TASKS_VIEW_SELF],
    });

    expect(TaskPolicies.viewOwn.handle(actor)).toBe(true);
  });

  it("enforces department scope for task management", () => {
    const actor = user({
      permissions: [Permissions.TASKS_ASSIGN],
    });

    expect(
      TaskPolicies.manage.handle(actor, {
        departmentId: "department-1",
      }),
    ).toBe(true);
    expect(
      TaskPolicies.manage.handle(actor, {
        departmentId: "department-2",
      }),
    ).toBe(false);
  });

  it("uses the canonical sys:all permission for global access", () => {
    expect(
      TaskPolicies.delete.handle(
        user({ permissions: [Permissions.SYS_ALL] }),
      ),
    ).toBe(true);
    expect(
      TaskPolicies.delete.handle(user({ permissions: ["ALL"] })),
    ).toBe(false);
  });
});
