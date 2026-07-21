import { Inject, Injectable } from "@nestjs/common";
import { PositionsRepository } from "../repositories/positions.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EMPLOYEE_READER_PORT, type IEmployeeReader } from "../../../../contracts/ports/employee-reader.port";

@Injectable()
export class ListPositionsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly positionRepo: PositionsRepository,
    private readonly requestContext: RequestContextService,
    @Inject(EMPLOYEE_READER_PORT)
    private readonly employeeReader: IEmployeeReader,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListPositionsUseCase.name);
  }

  async execute(_query: { departmentId?: string }) {
    const rows = await this.positionRepo.getActivePositions();
    const counts = await this.employeeReader.countActiveEmployeesByPositions();

    return {
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        isActive: row.isActive,
        employeeCount: counts[row.id] ?? 0,
        jobCategory: row.jobCategory ?? null,
      })),
      meta: {
        timestamp: new Date().toISOString(),
      },
      error: null,
    };
  }
}
