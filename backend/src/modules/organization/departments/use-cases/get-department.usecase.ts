import { Inject, Injectable } from "@nestjs/common";
import { DepartmentMapper } from "../mappers/department.mapper";
import { DepartmentQueryDto } from "../dto/department-query.dto";
import { DepartmentsRepository } from "../repositories/departments.repository";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EMPLOYEE_READER_PORT, type IEmployeeReader } from "../../../../contracts/ports/employee-reader.port";

@Injectable()
export class GetDepartmentUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly departmentsRepo: DepartmentsRepository,
    private readonly requestContext: RequestContextService,
    @Inject(EMPLOYEE_READER_PORT)
    private readonly employeeReader: IEmployeeReader,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetDepartmentUseCase.name);
  }

  async execute(id: string, query?: DepartmentQueryDto) {
    const result = await this.departmentsRepo.findById(id, query);

    if (!result) {
      throwNotFound(
        `Department with ID ${id} not found`,
        ERROR_CODES.DEPARTMENT_NOT_FOUND,
        {
          departmentId: id,
        },
      );
    }

    const counts = await this.employeeReader.countActiveEmployeesByDepartments();
    const resultWithCount = {
      ...result,
      employeeCount: counts[result.id] ?? 0,
    };

    return DepartmentMapper.toResponseDto(resultWithCount);
  }
}
