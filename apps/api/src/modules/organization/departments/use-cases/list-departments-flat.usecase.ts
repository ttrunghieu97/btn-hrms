import { Injectable } from "@nestjs/common";
import { DepartmentMapper } from "../mappers/department.mapper";
import { DepartmentQueryDto } from "../dto/department-query.dto";
import { DepartmentsRepository } from "../repositories/departments.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListDepartmentsFlatUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly departmentsRepo: DepartmentsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListDepartmentsFlatUseCase.name);
  }

  async execute(query: DepartmentQueryDto) {
    const list = await this.departmentsRepo.findList(query);
    return DepartmentMapper.toResponseDtos(list);
  }
}





