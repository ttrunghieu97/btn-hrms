import { Injectable } from "@nestjs/common";
import { UpdateDepartmentDto } from "../dto/update-department.dto";
import { DepartmentMapper } from "../mappers/department.mapper";
import { DepartmentsRepository } from "../repositories/departments.repository";
import {
  throwBadRequest,
  throwConflict,
  throwNotFound,
} from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import {
  extractUniqueField,
  isUniqueViolation,
} from "../../../../shared/utils/db-errors";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class UpdateDepartmentUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly departmentsRepo: DepartmentsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, UpdateDepartmentUseCase.name);
  }

  async execute(id: string, data: UpdateDepartmentDto) {
    const existing = await this.departmentsRepo.findById(id);
    if (!existing) {
      throwNotFound(
        `Department with ID ${id} not found`,
        ERROR_CODES.DEPARTMENT_NOT_FOUND,
        { departmentId: id },
      );
    }

    if (data.name) {
      const nameConflict = await this.departmentsRepo.existsNameConflict(
        data.name,
        id,
      );

      if (nameConflict) {
        throwConflict(
          "Department name already exists",
          ERROR_CODES.DEPARTMENT_ALREADY_EXISTS,
          { reason: ERROR_REASONS.DUPLICATE_DEPARTMENT_NAME, name: data.name },
        );
      }
    }

    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throwBadRequest(
          "A department cannot be its own parent",
          ERROR_CODES.INVALID_REQUEST,
          {
            departmentId: id,
            parentId: data.parentId,
          },
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
        await this.ensureNoHierarchyCycle(id, data.parentId);
      }
    }

    try {
      const result = await this.departmentsRepo.update(id, data);
      if (!result) {
        throwNotFound(
          `Department with ID ${id} not found`,
          ERROR_CODES.DEPARTMENT_NOT_FOUND,
          {
            departmentId: id,
          },
        );
      }
      return DepartmentMapper.toResponseDto(result);
    } catch (err: any  ) {
      if (isUniqueViolation(err)) {
        const field = extractUniqueField(err) ?? "";
        if (field.includes("name")) {
          throwConflict(
            "Department name already exists",
            ERROR_CODES.DEPARTMENT_ALREADY_EXISTS,
            {
              reason: ERROR_REASONS.DUPLICATE_DEPARTMENT_NAME,
              name: data.name ?? null,
            },
          );
        }
      }
      throw err;
    }
  }

  private async ensureNoHierarchyCycle(
    departmentId: string,
    candidateParentId: string,
  ): Promise<void> {
    const visited = new Set<string>();
    let cursor: string | null = candidateParentId;

    while (cursor) {
      if (cursor === departmentId) {
        throwBadRequest(
          "Department hierarchy cannot contain cycles",
          ERROR_CODES.INVALID_REQUEST,
          {
            departmentId,
            parentId: candidateParentId,
          },
        );
      }
      if (visited.has(cursor)) return;
      visited.add(cursor);

      const parentNode = await this.departmentsRepo.findById(cursor, {
        page: 1,
        limit: 20,
        fields: "id,parentId",
      });
      cursor = parentNode?.parentId ?? null;
    }
  }
}







