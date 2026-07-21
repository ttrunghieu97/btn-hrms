import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ERROR_CODES } from "../../shared/constants/error-codes";
import { GetReadinessUseCase } from "./get-readiness.usecase";

@Injectable()
export class GetStrictReadinessUseCase {
  constructor(private readonly getReadiness: GetReadinessUseCase) {}

  async execute() {
    const result = await this.getReadiness.execute();
    if (result.status === "ready") {
      return result;
    }

    const dependency = !result.database.ok
      ? "database"
      : !result.storage.ok
        ? "storage"
        : !result.eventBus.ok
          ? "event_bus"
          : "unknown";

    throw new ServiceUnavailableException({
      message: "Service dependencies are not ready",
      error: ERROR_CODES.SERVICE_UNAVAILABLE,
      details: {
        dependency,
        ...result,
      },
    });
  }
}
