import { Injectable } from "@nestjs/common";
import { CreateDepartmentDto } from "../dto/create-department.dto";
import { DepartmentMapper } from "../mappers/department.mapper";
import { DepartmentsRepository } from "../repositories/departments.repository";
import {
  throwConflict,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import {
  extractUniqueField,
  isUniqueViolation,
} from "../../../../shared/utils/db-errors";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class CreateDepartmentUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly departmentsRepo: DepartmentsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, CreateDepartmentUseCase.name);
  }

  async execute(data: CreateDepartmentDto) {
    const existing = await this.departmentsRepo.findByName(data.name);

    if (existing) {
      throwConflict(
        "Department name already exists",
        ERROR_CODES.DEPARTMENT_ALREADY_EXISTS,
        { reason: ERROR_REASONS.DUPLICATE_DEPARTMENT_NAME, name: data.name },
      );
    }

    if (data.parentId) {
      const parent = await this.departmentsRepo.findById(data.parentId);
      if (!parent) {
        throwNotFound(
          "Parent department does not exist",
          ERROR_CODES.DEPARTMENT_NOT_FOUND,
          {
            parentId: data.parentId,
          },
        );
      }
    }

    try {
      const result = await this.departmentsRepo.create(data);
      if (!result) {
        throwConflict(
          "Failed to create department",
          ERROR_CODES.DEPARTMENT_ALREADY_EXISTS,
          { name: data.name },
        );
      }
      return DepartmentMapper.toResponseDto(result);
    } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      if (isUniqueViolation(err)) {
        const field = extractUniqueField(err);
        if (field?.includes("name")) {
          throwConflict(
            "Department name already exists",
            ERROR_CODES.DEPARTMENT_ALREADY_EXISTS,
            {
              reason: ERROR_REASONS.DUPLICATE_DEPARTMENT_NAME,
              name: data.name,
            },
          );
        }
      }
      throw err;
    }
  }
}







