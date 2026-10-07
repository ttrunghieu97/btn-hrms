import { Injectable } from "@nestjs/common";
import { CreateGPSLogDto } from "../dto/create-gps-log.dto";
import { GPSLogMapper } from "../mappers/gps-log.mapper";
import { GPSLogsRepository } from "../repositories/gps-logs.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class CreateGPSLogUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly gpsLogsRepo: GPSLogsRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, CreateGPSLogUseCase.name);
  }

  async execute(employeeId: string, data: CreateGPSLogDto) {
    const result = await this.gpsLogsRepo.create({
      employeeId,
      latitude: data.latitude.toString(),
      longitude: data.longitude.toString(),
    });

    return GPSLogMapper.toResponseDto(result);
  }
}

