import { Injectable } from "@nestjs/common";
import { PerformanceCycleRepository } from "../repositories/performance-cycle.repository";
import { CycleResponseDto } from "../../dto/performance.dto";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class GetCycleUseCase {
  constructor(private readonly repo: PerformanceCycleRepository) {}
  async execute(id: string): Promise<CycleResponseDto> {
    const row = await this.repo.findById(id);
    if (!row) throwNotFound("Performance cycle not found", ERROR_CODES.NOT_FOUND);
    return { id: row.id, name: row.name, status: row.status, startsOn: row.startsOn, endsOn: row.endsOn, config: row.config, createdAt: row.createdAt };
  }
}
