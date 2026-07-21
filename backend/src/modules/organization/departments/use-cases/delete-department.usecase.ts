import { Injectable } from "@nestjs/common";
import { DepartmentMapper } from "../mappers/department.mapper";
import { DepartmentsRepository } from "../repositories/departments.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class DeleteDepartmentUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly departmentsRepo: DepartmentsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, DeleteDepartmentUseCase.name);
  }

  async execute(id: string) {
    const existing = await this.departmentsRepo.findById(id);
    if (!existing) {
      throwNotFound(
        `Department with ID ${id} not found`,
        ERROR_CODES.DEPARTMENT_NOT_FOUND,
        {
          departmentId: id,
        },
      );
    }
    await this.departmentsRepo.delete(id);
    return DepartmentMapper.toResponseDto(existing);
  }
}

