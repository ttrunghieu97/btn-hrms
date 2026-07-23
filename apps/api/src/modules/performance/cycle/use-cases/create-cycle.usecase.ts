import { Injectable } from "@nestjs/common";
import { PerformanceCycleRepository } from "../repositories/performance-cycle.repository";
import { CreateCycleDto, CycleResponseDto } from "../../dto/performance.dto";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class CreateCycleUseCase {
  constructor(private readonly repo: PerformanceCycleRepository) {}

  async execute(dto: CreateCycleDto): Promise<CycleResponseDto> {
    if (!dto.name?.trim()) throwBadRequest("Cycle name is required", ERROR_CODES.INVALID_REQUEST);
    if (!dto.startsOn) throwBadRequest("startsOn is required", ERROR_CODES.INVALID_REQUEST);
    if (!dto.endsOn) throwBadRequest("endsOn is required", ERROR_CODES.INVALID_REQUEST);
    if (dto.startsOn > dto.endsOn) throwBadRequest("startsOn must be before endsOn", ERROR_CODES.INVALID_REQUEST);
    const row = await this.repo.insert({ name: dto.name, startsOn: dto.startsOn, endsOn: dto.endsOn, status: "draft", config: dto.config });
    return { id: row.id, name: row.name, status: row.status, startsOn: row.startsOn, endsOn: row.endsOn, config: row.config, createdAt: row.createdAt };
  }
}
