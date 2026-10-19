import { Injectable, Inject } from "@nestjs/common";
import { BOARDING_PROCESS_READER_PORT, type IBoardingProcessReader } from "../../../contracts/ports/boarding-process-reader.port";
import type { OffboardingProcessListItemDto } from "../dto/offboarding-process-response.dto";

@Injectable()
export class ListOffboardingsUseCase {
  constructor(
    @Inject(BOARDING_PROCESS_READER_PORT)
    private readonly processReader: IBoardingProcessReader,
  ) {}

  async execute(
    page = 1,
    limit = 20,
    filters?: { employeeId?: string; status?: string },
  ): Promise<{ rows: OffboardingProcessListItemDto[]; total: number }> {
    const result = filters
      ? await this.processReader.findByType("offboarding", page, limit, filters)
      : await this.processReader.findByType("offboarding", page, limit);

    return {
      rows: result.rows.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        status: r.status,
        startDate: r.startDate,
        completedAt: r.completedAt?.toISOString() ?? null,
        createdAt: r.createdAt,
      })),
      total: result.total,
    };
  }
}
