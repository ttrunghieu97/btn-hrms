import { Injectable } from "@nestjs/common";
import { EmployeesRepository } from "../repositories/employees.repository";
import { GetEmployeeUseCase } from "./get-employee.usecase";
import { UpdateMyProfileDto } from "../dto/update-my-profile.dto";
import { throwNotFound, throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class UpdateMyProfileUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly getEmployee: GetEmployeeUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, UpdateMyProfileUseCase.name);
  }

  async execute(userId: string, dto: UpdateMyProfileDto) {
    const employee = await this.employeesRepo.findEmployeeByUserId(userId);
    if (!employee) {
      throwNotFound("Employee profile not found", ERROR_CODES.EMPLOYEE_NOT_FOUND, {
        userId,
      });
    }

    if (employee.deletedAt || employee.status === "terminated") {
      throwBadRequest(
        "Cannot update profile for terminated or archived employee",
        ERROR_CODES.INVALID_REQUEST,
        {
          reason: ERROR_REASONS.INVALID_STATE,
          employeeId: employee.id,
        },
      );
    }

    const isMasked = (val?: string | null) =>
      typeof val === "string" && val.startsWith("••••••••");

    const updates = {
      ...(dto.phoneNumber !== undefined ? { phoneNumber: dto.phoneNumber } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.emergencyContactName !== undefined
        ? { emergencyContactName: dto.emergencyContactName }
        : {}),
      ...(dto.emergencyContactPhone !== undefined
        ? { emergencyContactPhone: dto.emergencyContactPhone }
        : {}),
      ...(dto.bankName !== undefined ? { bankName: dto.bankName } : {}),
      ...(dto.bankAccountNumber !== undefined && !isMasked(dto.bankAccountNumber)
        ? { bankAccountNumber: dto.bankAccountNumber }
        : {}),
      ...(dto.taxCode !== undefined && !isMasked(dto.taxCode)
        ? { taxCode: dto.taxCode }
        : {}),
      updatedAt: new Date(),
    };

    await this.employeesRepo.transaction(async (tx) => {
      await this.employeesRepo.updateEmployeeById(employee.id, updates, tx);
    });

    this.logger.log({
      event: "employee.self_profile_updated",
      employeeId: employee.id,
      userId,
    });

    return this.getEmployee.execute(employee.id, undefined, true);
  }
}
