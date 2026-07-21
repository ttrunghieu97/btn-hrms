import { Injectable } from "@nestjs/common";
import {
  throwBadRequest,
  throwForbidden,
} from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { AuthUser } from "../../../core/security/types/auth-user.interface";
import { Permissions } from "../../../core/security/permissions/permissions.registry";
import {
  TASK_TRANSITIONS,
  TransitionDef,
  TaskTransition,
  getTargetStatus,
  type TaskStatus,
} from "./state-machine";
import { TaskWorkflowRepository } from "./repositories/task-workflow.repository";

export interface TransitionContext {
  task: {
    id: string;
    status: TaskStatus;
    assigneeId: string | null;
    createdByUserId: string | null;
    assignee?: { departmentId?: string | null } | null;
    revisionCount?: number;
    priority?: string;
  };
  actor: AuthUser;
  transition: TaskTransition;
  reason?: string;
}

export interface TransitionResult {
  targetStatus: TaskStatus;
  transition: TaskTransition;
  requiresReason: boolean;
  actorRoles: string[];
  isDelegated: boolean;
  delegatorUserId: string | null;
  delegationScope: "creator" | "department" | null;
  delegationDepartmentId: string | null;
}

export interface TransitionOption {
  transition: TaskTransition;
  targetStatus: TaskStatus;
  requiresReason: boolean;
}

@Injectable()
export class TransitionValidator {
  constructor(private readonly repo: TaskWorkflowRepository) {}

  async validate(ctx: TransitionContext): Promise<TransitionResult> {
    const { task, actor, transition, reason } = ctx;

    const targetStatus = getTargetStatus(task.status, transition);
    if (!targetStatus) {
      throwBadRequest(
        `Invalid transition: ${task.status} → ${transition}`,
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        { taskId: task.id, from: task.status, transition },
      );
    }

    const def = TASK_TRANSITIONS[transition];
    const requiresReason = def.requiresReason ?? false;
    if (requiresReason && (!reason || reason.trim() === "")) {
      throwBadRequest(
        `Transition "${transition}" requires a reason`,
        ERROR_CODES.INVALID_REQUEST,
        { transition },
      );
    }

    const actorCtx = await this.resolveActorContext(task, actor);
    const actorRoles = [
      actorCtx.isAssignee ? "assignee" : null,
      actorCtx.isCreator ? "creator" : null,
      actorCtx.isManager ? "manager" : null,
      actorCtx.isAdmin ? "admin" : null,
    ].filter(Boolean) as string[];

    const hasAllowedRole = def.allowedRoles.some((r) => actorRoles.includes(r));
    if (!hasAllowedRole) {
      throwForbidden(
        `You do not have permission to perform "${transition}" on this task`,
        ERROR_CODES.PERMISSION_DENIED,
        { transition, actorRoles },
      );
    }

    // Dept-scope enforcement for manager actions (unless delegated)
    if (
      (transition === "approve" || transition === "request_revision") &&
      actorCtx.isManager &&
      !actorCtx.isAssignee &&
      !actorCtx.isDelegated
    ) {
      const assigneeDeptId = task.assignee?.departmentId ?? null;
      if (
        assigneeDeptId &&
        actor.departmentId &&
        String(assigneeDeptId) !== String(actor.departmentId)
      ) {
        throwForbidden(
          `You do not have permission to perform "${transition}" on this task`,
          ERROR_CODES.PERMISSION_DENIED,
          { transition, assigneeDeptId, actorDeptId: actor.departmentId },
        );
      }
    }

    return {
      targetStatus,
      transition,
      requiresReason,
      actorRoles,
      isDelegated: actorCtx.isDelegated,
      delegatorUserId: actorCtx.delegatorUserId,
      delegationScope: actorCtx.delegationScope,
      delegationDepartmentId: actorCtx.delegationDepartmentId,
    };
  }

  async getAllowedTransitions(
    task: TransitionContext["task"],
    actor: AuthUser,
  ): Promise<TransitionOption[]> {
    const actorCtx = await this.resolveActorContext(task, actor);

    const isAssignee = actorCtx.isAssignee;
    const isCreator = actorCtx.isCreator;
    const isManager = actorCtx.isManager;
    const isAdmin = actorCtx.isAdmin;
    const isDelegated = actorCtx.isDelegated;

    const options: TransitionOption[] = [];
    for (const [transition, def] of Object.entries(TASK_TRANSITIONS) as [
      TaskTransition,
      TransitionDef,
    ][]) {
      const froms = Array.isArray(def.from) ? def.from : [def.from];
      if (!froms.includes(task.status)) continue;

      const roles = new Set<string>();
      if (isAssignee) roles.add("assignee");
      if (isCreator) roles.add("creator");
      if (isManager) roles.add("manager");
      if (isAdmin) roles.add("admin");

      const hasAllowedRole = def.allowedRoles.some((r) => roles.has(r));
      if (!hasAllowedRole) continue;

      if (
        (transition === "approve" || transition === "request_revision") &&
        isManager &&
        !isAssignee &&
        !isDelegated
      ) {
        const assigneeDeptId = task.assignee?.departmentId ?? null;
        if (
          assigneeDeptId &&
          actor.departmentId &&
          String(assigneeDeptId) !== String(actor.departmentId)
        ) {
          continue;
        }
      }

      if (transition === "request_revision") {
        const revisionCount = task.revisionCount ?? 0;
        const maxRevisions = await this.repo.getMaxRevisionCountForPriority(
          task.priority ?? null,
        );
        if (maxRevisions !== null && revisionCount >= maxRevisions) continue;
      }

      options.push({
        transition,
        targetStatus: def.to,
        requiresReason: def.requiresReason ?? false,
      });
    }

    return options;
  }

  private async resolveActorContext(
    task: TransitionContext["task"],
    actor: AuthUser,
  ): Promise<{
    isAssignee: boolean;
    isCreator: boolean;
    isAdmin: boolean;
    isManager: boolean;
    isDelegated: boolean;
    delegatorUserId: string | null;
    delegationScope: "creator" | "department" | null;
    delegationDepartmentId: string | null;
  }> {
    const isAssignee =
      task.assigneeId &&
      actor.employeeId &&
      String(task.assigneeId) === String(actor.employeeId);

    const isCreator =
      task.createdByUserId && String(task.createdByUserId) === String(actor.id);

    const isAdmin = actor.permissions?.includes("ALL") ?? false;

    const isManagerPermitted =
      actor.permissions?.includes(Permissions.TASKS_EDIT) ||
      actor.permissions?.includes(Permissions.TASKS_ASSIGN);

    let isDelegated = false;
    let delegatorUserId: string | null = null;
    let delegationScope: "creator" | "department" | null = null;
    let delegationDepartmentId: string | null = null;

    if (!isCreator && !actor.isSuperAdmin) {
      const creatorScoped =
        task.createdByUserId && actor.id
          ? await this.repo.findCreatorScopedDelegation({
              delegatorUserId: task.createdByUserId,
              delegateeUserId: actor.id,
            })
          : null;

      const assigneeDeptId = task.assignee?.departmentId ?? null;
      const deptScoped =
        assigneeDeptId && !creatorScoped && actor.id
          ? await this.repo.findDepartmentScopedDelegation({
              departmentId: assigneeDeptId,
              delegateeUserId: actor.id,
            })
          : null;

      if (creatorScoped) {
        isDelegated = true;
        delegatorUserId = task.createdByUserId ?? null;
        delegationScope = "creator";
      } else if (deptScoped) {
        isDelegated = true;
        delegatorUserId = deptScoped.delegatorUserId ?? null;
        delegationScope = "department";
        delegationDepartmentId = deptScoped.departmentId ?? null;
      }
    }

    const isManager = Boolean(isManagerPermitted || isDelegated);

    return {
      isAssignee: Boolean(isAssignee),
      isCreator: Boolean(isCreator),
      isAdmin,
      isManager,
      isDelegated: Boolean(isDelegated),
      delegatorUserId,
      delegationScope,
      delegationDepartmentId,
    };
  }
}
