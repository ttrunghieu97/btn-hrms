import { Injectable } from "@nestjs/common";
import { GPSLogQueryDto } from "../dto/gps-log-query.dto";
import { GPSLogMapper } from "../mappers/gps-log.mapper";
import { GPSLogsRepository } from "../repositories/gps-logs.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class ListGPSLogsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly gpsLogsRepo: GPSLogsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, ListGPSLogsUseCase.name);
  }

  async execute(query: GPSLogQueryDto) {
    const list = await this.gpsLogsRepo.findMany(query);
    return GPSLogMapper.toResponseDtos(list);
  }
}

