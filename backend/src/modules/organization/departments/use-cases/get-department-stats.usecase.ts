import { Inject, Injectable } from "@nestjs/common";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EMPLOYEE_READER_PORT, type IEmployeeReader } from "../../../../contracts/ports/employee-reader.port";

@Injectable()
export class GetDepartmentStatsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly requestContext: RequestContextService,
    @Inject(EMPLOYEE_READER_PORT)
    private readonly employeeReader: IEmployeeReader,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetDepartmentStatsUseCase.name);
  }

  async execute() {
    return this.employeeReader.countActiveEmployeesByDepartments();
  }
}
