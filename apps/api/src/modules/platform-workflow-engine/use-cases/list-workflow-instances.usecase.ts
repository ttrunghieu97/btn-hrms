import { Injectable } from "@nestjs/common";
import { PlatformWorkflowEngineRepository } from "../repositories/platform-workflow-engine.repository";
import { safeLimit, safePage } from "../../../shared/dto/pagination.dto";
import { WorkflowInstanceQueryDto } from "../dto/workflow-instance-query.dto";
import type { AuthUser } from "../../../core/security/types/auth-user.interface";
import { EMPLOYEE_WORKFLOW_SUBJECT_TYPES, WorkflowPolicies, hasGlobalWorkflowViewAccess } from "../policies/workflow.policy";
import { EmployeePolicies } from "../../../core/security/policies/employee.policy";
import { throwForbidden } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

@Injectable()
export class ListWorkflowInstancesUseCase {
  constructor(private readonly repo: PlatformWorkflowEngineRepository) {}

  async execute(query: WorkflowInstanceQueryDto, user?: AuthUser) {
    const page = safePage(query.page);
    const limit = safeLimit(query.limit);
    const offset = (page - 1) * limit;

    let subjectTypes: string[] | undefined;

    if (user && !hasGlobalWorkflowViewAccess(user)) {
      if (!WorkflowPolicies.viewInstances.handle(user)) {
        throwForbidden(
          "Workflow instance access requires workflow or employee lifecycle management permissions",
          ERROR_CODES.PERMISSION_DENIED,
        );
      }
      if (!query.subjectId) {
        throwForbidden(
          "subjectId is required when listing workflow instances with employee-scoped permissions",
          ERROR_CODES.PERMISSION_DENIED,
        );
      }
      if (
        query.subjectType &&
        !EMPLOYEE_WORKFLOW_SUBJECT_TYPES.includes(query.subjectType as (typeof EMPLOYEE_WORKFLOW_SUBJECT_TYPES)[number])
      ) {
        throwForbidden(
          "Access to non-employee workflow instances is denied",
          ERROR_CODES.PERMISSION_DENIED,
        );
      }

      const empContext = await this.repo.getEmployeeScopeContext(query.subjectId);
      const allowed = EmployeePolicies.view.handle(
        user,
        empContext ?? { id: query.subjectId },
      );
      if (!allowed) {
        throwForbidden(
          "Out-of-scope employee workflow access denied",
          ERROR_CODES.PERMISSION_DENIED,
        );
      }

      subjectTypes = query.subjectType
        ? [query.subjectType]
        : [...EMPLOYEE_WORKFLOW_SUBJECT_TYPES];
    }

    const opts = {
      status: query.status,
      definitionId: query.definitionId,
      subjectType: query.subjectType,
      subjectTypes,
      subjectId: query.subjectId,
      limit,
      offset,
    };

    const [rows, total] = await Promise.all([
      this.repo.listInstances(opts),
      this.repo.countInstances(opts),
    ]);

    return { rows, total: Number(total), page, limit, hasNext: offset + limit < Number(total) };
  }
}
