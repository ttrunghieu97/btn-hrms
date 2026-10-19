import { Injectable } from "@nestjs/common";
import { PlatformWorkflowEngineRepository } from "../repositories/platform-workflow-engine.repository";
import { throwForbidden, throwNotFound } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import type { AuthUser } from "../../../core/security/types/auth-user.interface";
import { EMPLOYEE_WORKFLOW_SUBJECT_TYPES, WorkflowPolicies, hasGlobalWorkflowViewAccess } from "../policies/workflow.policy";
import { EmployeePolicies } from "../../../core/security/policies/employee.policy";

@Injectable()
export class GetWorkflowInstanceUseCase {
  constructor(private readonly repo: PlatformWorkflowEngineRepository) {}

  async execute(id: string, user?: AuthUser) {
    const instance = await this.repo.getInstance(id);
    if (!instance) throwNotFound("Workflow instance not found", ERROR_CODES.WORKFLOW_ACTION_FAILED, { id });

    if (user && !hasGlobalWorkflowViewAccess(user)) {
      if (!WorkflowPolicies.viewInstances.handle(user)) {
        throwForbidden(
          "Workflow instance access requires workflow or employee lifecycle management permissions",
          ERROR_CODES.PERMISSION_DENIED,
        );
      }
      if (
        !EMPLOYEE_WORKFLOW_SUBJECT_TYPES.includes(
          instance.subjectType as (typeof EMPLOYEE_WORKFLOW_SUBJECT_TYPES)[number],
        )
      ) {
        throwForbidden(
          "Access to non-employee workflow instance is denied",
          ERROR_CODES.PERMISSION_DENIED,
        );
      }

      const empContext = await this.repo.getEmployeeScopeContext(instance.subjectId);
      const allowed = EmployeePolicies.view.handle(
        user,
        empContext ?? { id: instance.subjectId },
      );
      if (!allowed) {
        throwForbidden(
          "Out-of-scope employee workflow access denied",
          ERROR_CODES.PERMISSION_DENIED,
        );
      }
    }

    const transitions = await this.repo.listTransitionsByInstanceId(id);
    return { ...instance, transitions };
  }
}
