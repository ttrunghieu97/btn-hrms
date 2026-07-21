import { Injectable } from "@nestjs/common";
import { EmployeesRepository } from "../repositories/employees.repository";
import { GetEmployeeUseCase } from "./get-employee.usecase";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { Permissions } from "../../../../core/security/permissions/permissions.registry";

@Injectable()
export class GetEmployeeByUserUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly getEmployee: GetEmployeeUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetEmployeeByUserUseCase.name);
  }

  async execute(userId: string, sensitiveFieldsAllowed = false) {
    const employee = await this.employeesRepo.findEmployeeByUserId(userId);
    if (!employee) {
      throwNotFound(
        `Profile for user id ${userId} not found`,
        ERROR_CODES.EMPLOYEE_NOT_FOUND,
        { userId },
      );
    }
    if (sensitiveFieldsAllowed && this.hasSensitiveAccess()) {
      return this.getEmployee.execute(employee.id, undefined, true);
    }
    return this.getEmployee.execute(employee.id);
  }

  private hasSensitiveAccess(): boolean {
    const context = (this.requestContext as { get?: () => { isSuperAdmin?: boolean; permissions?: string[] } | undefined }).get?.();
    return (
      context?.isSuperAdmin === true ||
      context?.permissions?.includes(Permissions.SYS_ALL) === true ||
      context?.permissions?.includes(Permissions.EMPLOYEES_VIEW_SENSITIVE) === true ||
      context?.permissions?.includes(Permissions.EMPLOYEES_MANAGE_SENSITIVE) === true
    );
  }
}

