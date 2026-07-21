import * as bcrypt from "bcrypt";
import { todayDateString } from "../../../../shared/utils/date-format";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CreateEmployeeDto } from "../dto/create-employee.dto";
import { EmployeesRepository } from "../repositories/employees.repository";
import { GetEmployeeUseCase } from "./get-employee.usecase";
import {
  buildUsernameFromName,
  normalizeUsername,
} from "../employees.helpers";
import { EmployeeMapper } from "../mappers/employee.mapper";
import { EmployeeHiredEvent } from "../../../../core/events/events/employee-hired.event";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { getScopeId } from "../../../../shared/constants/system";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { throwBadRequest, throwConflict } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import { extractUniqueField, isUniqueViolation } from "../../../../shared/utils/db-errors";
import { CONTRACTS_TOKENS } from "../../../../contracts/contracts.tokens";
import type { IdentityAdminPort } from "../../../../contracts/ports/identity-admin.port";
import type { PositionReaderPort } from "../../../../contracts/ports/position-reader.port";
import { AssignDefaultEmployeeRoleUseCase } from "../../../identity/access-control/use-cases/assign-default-employee-role.usecase";
import { ResolveEmployeeAttachmentPlanService } from "../services/resolve-employee-attachment-plan.service";
import { ApplyEmployeeAttachmentPlanService } from "../services/apply-employee-attachment-plan.service";
import { StorageService } from "../../../../infrastructure/storage/storage.service";
import { EmployeeContractsRepository } from "../../../workforce/employee-contracts/repositories/employee-contracts.repository";

function deriveContractType(
  status?: CreateEmployeeDto["status"],
  contractType?: CreateEmployeeDto["contractType"],
): "permanent" | "fixed_term" | "probationary" | "internship" | "service" | "part_time" {
  if (contractType) return contractType;
  return status === "probation" ? "probationary" : "permanent";
}

function deriveContractStatus(status?: CreateEmployeeDto["status"]) {
  return status === "terminated" ? "terminated" : "active";
}


function errorMessage(error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */): string {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class CreateEmployeeUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly getEmployee: GetEmployeeUseCase,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
    @Inject(CONTRACTS_TOKENS.POSITION_READER_PORT)
    private readonly positionReader: PositionReaderPort,
    @Inject(CONTRACTS_TOKENS.IDENTITY_ADMIN_PORT)
    private readonly identityAdmin: IdentityAdminPort,
    private readonly configService: ConfigService,
    private readonly assignDefaultRole: AssignDefaultEmployeeRoleUseCase,
    private readonly resolveAttachmentPlan: ResolveEmployeeAttachmentPlanService,
    private readonly applyAttachmentPlan: ApplyEmployeeAttachmentPlanService,
    private readonly storage: StorageService,
    private readonly contractRepo: EmployeeContractsRepository,
  ) {
    this.logger = new ContextLogger(this.requestContext, CreateEmployeeUseCase.name);
  }

  async execute(data: CreateEmployeeDto) {
    const { avatar, documents, certifications, ...rawEmployeeData } = data;
    const attachmentPlan = this.resolveAttachmentPlan.execute({
      avatar,
      documents,
      certifications,
    });

    let baseUsername = normalizeUsername(rawEmployeeData.username);
    if (!baseUsername) {
      if (rawEmployeeData.email) {
        baseUsername = normalizeUsername(rawEmployeeData.email.split("@")[0]);
      }
      if (!baseUsername) {
        baseUsername = buildUsernameFromName(rawEmployeeData.firstName, rawEmployeeData.lastName);
      }
    }

    if (!baseUsername) {
      throwBadRequest("Username is required", ERROR_CODES.INVALID_REQUEST, {
        reason: ERROR_REASONS.INVALID_STATE,
      });
    }

    const username = baseUsername;
    const exists = await this.employeesRepo.userExistsByUsername(username);
    if (exists) {
      throwConflict("Username already exists", ERROR_CODES.USERNAME_ALREADY_EXISTS, {
        reason: ERROR_REASONS.DUPLICATE_USERNAME,
        username,
      });
    }

    const email = rawEmployeeData.email ? rawEmployeeData.email : null;
    const defaultPassword = this.configService.get<string>("AUTH_DEFAULT_PASSWORD")!;
    const password =
      !data.password || data.password.trim().length === 0 ? defaultPassword : data.password;
    const passwordHash = await bcrypt.hash(password, 10);

    const { departmentId, positionId, position, startDate, endDate, status } =
      rawEmployeeData;
    const employeeCoreData = EmployeeMapper.toEntity(rawEmployeeData);

    const resolvedPosition =
      positionId !== undefined ? await this.positionReader.getActive(positionId) : null;

    let employeeId!: string;
    let _userId!: string;

    try {
      ({ employeeId, userId: _userId } = await this.employeesRepo.transaction(async (tx) => {
        const user = await this.identityAdmin.createUser(
          {
            username,
            email,
            passwordHash,
            isSuperAdmin: false,
          },
          tx,
        );

        const employee = await this.employeesRepo.insertEmployee(
          {
            ...employeeCoreData,
            firstName: rawEmployeeData.firstName,
            lastName: rawEmployeeData.lastName,
            employeeCode: rawEmployeeData.employeeCode,
            userId: user.id,
            status: status ?? "working",
            startDate: startDate ?? todayDateString(),
            endDate: endDate ?? null,
            ...(status === "probation"
              ? { probationEndDate: endDate ?? null }
              : {}),
          },
          tx,
        );

        if (!employee) {
          throwBadRequest("Failed to create employee", ERROR_CODES.INVALID_REQUEST, {
            reason: ERROR_REASONS.INVALID_STATE,
          });
        }

        await this.employeesRepo.insertEmploymentRecord(
          {
            employeeId: employee.id,
            startDate: startDate ?? todayDateString(),
            endDate: endDate ?? null,
            isCurrent: true,
          },
          tx,
        );

        await this.contractRepo.create(
          {
            employeeId: employee.id,
            contractNumber: employee.employeeCode ? `${employee.employeeCode}-01` : null,
            contractType: deriveContractType(status, rawEmployeeData.contractType),
            status: deriveContractStatus(status),
            version: 1,
            effectiveFrom: startDate ?? todayDateString(),
            effectiveTo: endDate ?? null,
          },
          tx,
        );

        await this.employeesRepo.insertOrgAssignment(
          {
            employeeId: employee.id,
            departmentId: departmentId ?? null,
            jobTitle: resolvedPosition?.name ?? position ?? null,
            assignmentType: "primary",
            effectiveFrom: startDate ?? todayDateString(),
            effectiveTo: endDate ?? null,
            isCurrent: true,
          },
          tx,
        );

        return { employeeId: employee.id, userId: user.id };
      }));
    } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      if (isUniqueViolation(err)) {
        const field = extractUniqueField(err) ?? "";
        if (field.includes("username")) {
          throwConflict("Username already exists", ERROR_CODES.USERNAME_ALREADY_EXISTS, {
            reason: ERROR_REASONS.DUPLICATE_USERNAME,
            username,
          });
        }
        if (field.includes("email")) {
          throwConflict("Email already exists", ERROR_CODES.EMAIL_ALREADY_EXISTS, {
            reason: ERROR_REASONS.DUPLICATE_EMAIL,
            email,
          });
        }
        if (field.includes("employee_code")) {
          throwConflict("Employee code already exists", ERROR_CODES.EMPLOYEE_CODE_ALREADY_EXISTS, {
            reason: ERROR_REASONS.DUPLICATE_EMPLOYEE_CODE,
            employeeCode: rawEmployeeData.employeeCode ?? null,
          });
        }
      }
      throw err;
    }

    try {
      await this.applyAttachmentPlan.execute({ employeeId, plan: attachmentPlan });
      await this.assignDefaultRole.execute(_userId);
      await this.employeesRepo.transaction(async (tx) => {
        await this.eventOutbox.stage(
          new EmployeeHiredEvent({
            scopeId: getScopeId(),
            employeeId,
            userId: _userId,
            hiredByUserId: this.requestContext.get()?.userId ?? null,
          }),
          tx,
        );
      });
      return this.getEmployee.execute(employeeId);
    } catch (error) {
      try {
        await this.employeesRepo.transaction(async (tx) => {
          await this.employeesRepo.hardDeleteEmployee(employeeId, tx);
          await this.identityAdmin.deleteUser(_userId, tx);
        });
      } catch (cleanupError) {
        this.logger.error({
          event: "employee.create.compensation.database_failed",
          employeeId,
          userId: _userId,
          error: errorMessage(cleanupError),
        });
      }
      try {
        await this.storage.purgeOwnerFiles("employee", employeeId);
      } catch (cleanupError) {
        this.logger.error({
          event: "employee.create.compensation.storage_failed",
          employeeId,
          error: errorMessage(cleanupError),
        });
      }
      throw error;
    }
  }
}



