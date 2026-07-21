import { Inject, Injectable } from "@nestjs/common";
import { buildPaginatedResponse } from "../../../../shared/utils/pagination.util";
import { DepartmentMapper } from "../mappers/department.mapper";
import { DepartmentQueryDto } from "../dto/department-query.dto";
import { DepartmentsRepository } from "../repositories/departments.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EMPLOYEE_READER_PORT, type IEmployeeReader } from "../../../../contracts/ports/employee-reader.port";

@Injectable()
export class ListDepartmentsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly departmentsRepo: DepartmentsRepository,
    private readonly requestContext: RequestContextService,
    @Inject(EMPLOYEE_READER_PORT)
    private readonly employeeReader: IEmployeeReader,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListDepartmentsUseCase.name);
  }

  async execute(query: DepartmentQueryDto) {
    const { rows, total, page, limit } =
      await this.departmentsRepo.findPaginated(query);

    const counts = await this.employeeReader.countActiveEmployeesByDepartments();
    const rowsWithCounts = rows.map((row) => ({
      ...row,
      employeeCount: counts[row.id] ?? 0,
    }));

    return buildPaginatedResponse(
      DepartmentMapper.toResponseDtos(rowsWithCounts),
      total,
      page,
      limit,
    );
  }
}
