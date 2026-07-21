import { Injectable } from "@nestjs/common";
import { GetEmployeeByUserUseCase } from "../../employees/use-cases/get-employee-by-user.usecase";
import { CreateGPSLogDto } from "../dto/create-gps-log.dto";
import { CreateGPSLogUseCase } from "./create-gps-log.usecase";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class CreateGPSLogForCurrentUserUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly getEmployeeByUser: GetEmployeeByUserUseCase,
    private readonly createGPSLog: CreateGPSLogUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, CreateGPSLogForCurrentUserUseCase.name);
  }

  async execute(userId: string, dto: CreateGPSLogDto) {
    const employee = await this.getEmployeeByUser.execute(userId);
    return this.createGPSLog.execute(employee.id, dto);
  }
}

