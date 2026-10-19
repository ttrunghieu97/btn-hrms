import { Inject, Injectable } from "@nestjs/common";
import { EmployeeMapper } from "../mappers/employee.mapper";
import { EmployeeQueryDto } from "../dto/employee-query.dto";
import { EmployeesRepository, EmployeeWithRelations } from "../repositories/employees.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { CONTRACTS_TOKENS } from "../../../../contracts/contracts.tokens";
import { PositionReaderPort } from "../../../../contracts/ports/position-reader.port";
import { Permissions } from "../../../../core/security/permissions/permissions.registry";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class GetEmployeeUseCase {
  constructor(
    private readonly employeesRepo: EmployeesRepository,
    @Inject(CONTRACTS_TOKENS.POSITION_READER_PORT)
    private readonly positionReader: PositionReaderPort,
    private readonly requestContext?: RequestContextService,
  ) {}

  async execute(identifier: string, query?: EmployeeQueryDto, sensitiveFieldsAllowed = false) {
    const row = await this.employeesRepo.findByIdentifier(identifier, query);

    if (!row) {
      throwNotFound(
        "Employee profile not found",
        ERROR_CODES.EMPLOYEE_NOT_FOUND,
        { identifier },
      );
    }

    const employeeWithRelations = row as EmployeeWithRelations;
    const currentAssignment =
      employeeWithRelations.orgAssignments?.find((item) => item.isCurrent) ?? employeeWithRelations.orgAssignments?.[0];
    let position = null;
    if (currentAssignment?.jobTitle) {
      position = await this.positionReader.findActiveByTitle(currentAssignment.jobTitle);
    }

    return EmployeeMapper.toResponseDtoWithPosition(
      row,
      position
        ? {
            id: position.id,
            name: position.name,
            description: position.description,
            isActive: position.isActive,
          }
        : null,
      sensitiveFieldsAllowed && this.hasSensitiveAccess(),
    );
  }

  private hasSensitiveAccess(): boolean {
    const context = this.requestContext?.get?.();
    if (!context) return false;
    const perms = context.permissions ?? [];
    return (
      context.isSuperAdmin === true ||
      perms.includes(Permissions.SYS_ALL) ||
      perms.includes(Permissions.EMPLOYEES_VIEW_SENSITIVE) ||
      perms.includes("employees:view:sensitive") ||
      perms.includes(Permissions.EMPLOYEES_MANAGE_SENSITIVE) ||
      perms.includes("employees:manage:sensitive")
    );
  }
}


