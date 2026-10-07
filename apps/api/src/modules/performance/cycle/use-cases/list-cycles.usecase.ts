import { Injectable } from "@nestjs/common";
import { PerformanceCycleRepository } from "../repositories/performance-cycle.repository";
import { CycleResponseDto } from "../../dto/performance.dto";

@Injectable()
export class ListCyclesUseCase {
  constructor(private readonly repo: PerformanceCycleRepository) {}
  async execute(): Promise<CycleResponseDto[]> {
    const rows = await this.repo.findMany();
    return rows.map((r) => ({ id: r.id, name: r.name, status: r.status, startsOn: r.startsOn, endsOn: r.endsOn, config: r.config, createdAt: r.createdAt }));
  }
}
