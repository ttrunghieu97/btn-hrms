import { Injectable } from "@nestjs/common";
import { EmployeesRepository } from "../repositories/employees.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class CheckEmployeeCodeUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly repository: EmployeesRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, CheckEmployeeCodeUseCase.name);
  }

  async execute(employeeCode: string): Promise<{ exists: boolean }> {
    const exists = await this.repository.checkCodeExists(employeeCode);
    return { exists };
  }
}

