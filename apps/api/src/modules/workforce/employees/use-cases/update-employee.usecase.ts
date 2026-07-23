import { Inject, Injectable } from "@nestjs/common";
import { UpdateEmployeeDto } from "../dto/update-employee.dto";
import { EmployeesRepository } from "../repositories/employees.repository";
import { GetEmployeeUseCase } from "./get-employee.usecase";
import { normalizeUsername } from "../employees.helpers";
import { EmployeeMapper } from "../mappers/employee.mapper";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { throwBadRequest, throwConflict, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import { extractUniqueField, isUniqueViolation } from "../../../../shared/utils/db-errors";
import { CONTRACTS_TOKENS } from "../../../../contracts/contracts.tokens";
import { PositionReaderPort } from "../../../../contracts/ports/position-reader.port";
import { ResolveEmployeeAttachmentPlanService } from "../services/resolve-employee-attachment-plan.service";
import { ApplyEmployeeAttachmentPlanService } from "../services/apply-employee-attachment-plan.service";

@Injectable()
export class UpdateEmployeeUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly getEmployee: GetEmployeeUseCase,
    private readonly requestContext: RequestContextService,
    private readonly resolveAttachmentPlan: ResolveEmployeeAttachmentPlanService,
    private readonly applyAttachmentPlan: ApplyEmployeeAttachmentPlanService,
    @Inject(CONTRACTS_TOKENS.POSITION_READER_PORT)
    private readonly positionReader: PositionReaderPort,
  ) {
    this.logger = new ContextLogger(this.requestContext, UpdateEmployeeUseCase.name);
  }

  async execute(identifier: string, data: UpdateEmployeeDto) {
    const { avatar, documents, certifications, ...rawEmployeeData } = data;
    const attachmentPlan = this.resolveAttachmentPlan.execute({
      avatar,
      documents,
      certifications,
    });
    const { departmentId, positionId, position, startDate, endDate, status } =
      rawEmployeeData;
    const employeeCoreData = EmployeeMapper.toEntity(rawEmployeeData);

    const normalizedUsername = data.username !== undefined ? normalizeUsername(data.username) : "";

    const resolvedPosition =
      positionId !== undefined && positionId !== null && positionId !== ""
        ? await this.positionReader.getActive(positionId)
        : null;

    if (data.username !== undefined && !normalizedUsername) {
      throwBadRequest("Username is invalid", ERROR_CODES.INVALID_REQUEST, {
        reason: ERROR_REASONS.INVALID_STATE,
      });
    }

    const initialContext = await this.employeesRepo.findEmployeeUserContextByIdentifier(identifier);
    if (!initialContext) {
      throwNotFound(`Employee ${identifier} not found`, ERROR_CODES.EMPLOYEE_NOT_FOUND, {
        identifier,
      });
    }

    const employeeId = initialContext.employeeId;
    try {
      await this.applyAttachmentPlan.execute({
        employeeId,
        plan: attachmentPlan,
        mutateInTransaction: async (tx) => {
          const context = await this.employeesRepo.findEmployeeUserContextByIdentifier(
            identifier,
            tx,
          );
          if (!context) {
            throwNotFound(`Employee ${identifier} not found`, ERROR_CODES.EMPLOYEE_NOT_FOUND, {
              identifier,
            });
          }

          const { employeeId: empId, userId, username } = context;
          const userUpdate: Partial<{
            username: string;
            email: string | null;
          }> = {};

          if (data.username !== undefined && normalizedUsername !== username) {
            const exists = await this.employeesRepo.userExistsByUsername(normalizedUsername);
            if (exists) {
              throwConflict("Username already exists", ERROR_CODES.USERNAME_ALREADY_EXISTS, {
                reason: ERROR_REASONS.DUPLICATE_USERNAME,
                username: normalizedUsername,
              });
            }
            userUpdate.username = normalizedUsername;
          }

          if (data.email !== undefined) {
            const trimmed = data.email?.trim() ?? "";
            userUpdate.email = trimmed.length > 0 ? trimmed : null;
          }

          if (Object.keys(userUpdate).length > 0) {
            await this.employeesRepo.updateUserById(userId, userUpdate, tx);
          }

          const updatedEmp = await this.employeesRepo.updateEmployeeById(
            empId,
            {
              ...employeeCoreData,
              ...(status !== undefined ? { status } : {}),
              ...(startDate !== undefined ? { startDate } : {}),
              ...(endDate !== undefined ? { endDate } : {}),
              ...(status === "probation"
                ? { probationEndDate: endDate ?? null }
                : status !== undefined
                  ? { probationEndDate: null }
                  : {}),
              updatedAt: new Date(),
            },
            tx,
          );

          if (!updatedEmp) {
            throwNotFound("Employee not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, {
              employeeId: empId,
            });
          }

          await this.employeesRepo.upsertCurrentOrgAssignment(
            empId,
            {
              ...(departmentId !== undefined ? { departmentId } : {}),
              ...(position !== undefined || positionId !== undefined
                ? { jobTitle: resolvedPosition?.name ?? position ?? null }
                : {}),
              ...(startDate !== undefined ? { effectiveFrom: startDate } : {}),
              ...(endDate !== undefined ? { effectiveTo: endDate } : {}),
            },
            tx,
          );

        },
      });
    } catch (err: any  ) {
      if (isUniqueViolation(err)) {
        const field = extractUniqueField(err) ?? "";
        if (field.includes("username")) {
          throwConflict("Username already exists", ERROR_CODES.USERNAME_ALREADY_EXISTS, {
            reason: ERROR_REASONS.DUPLICATE_USERNAME,
            username: normalizedUsername,
          });
        }
        if (field.includes("email")) {
          throwConflict("Email already exists", ERROR_CODES.EMAIL_ALREADY_EXISTS, {
            reason: ERROR_REASONS.DUPLICATE_EMAIL,
            email: data.email ?? null,
          });
        }
        if (field.includes("employee_code")) {
          throwConflict("Employee code already exists", ERROR_CODES.EMPLOYEE_CODE_ALREADY_EXISTS, {
            reason: ERROR_REASONS.DUPLICATE_EMPLOYEE_CODE,
            employeeCode: data.employeeCode ?? null,
          });
        }
      }
      throw err;
    }

    return this.getEmployee.execute(employeeId);
  }
}



