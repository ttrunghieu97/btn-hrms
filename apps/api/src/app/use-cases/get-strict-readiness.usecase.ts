import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ERROR_CODES } from "../../shared/constants/error-codes";
import { GetReadinessUseCase } from "./get-readiness.usecase";

@Injectable()
export class GetStrictReadinessUseCase {
  constructor(private readonly getReadiness: GetReadinessUseCase) {}

  async execute() {
    const result = await this.getReadiness.execute();
    if (result.status === "ready" && result.productionReady) {
      return result;
    }

    const faceReady =
      result.adapters?.facePresence?.configured &&
      !result.adapters?.facePresence?.simulated;
    const dependency = !result.database.ok
      ? "database"
      : !result.redis.ok
        ? "redis"
        : !result.storage.ok
          ? "storage"
          : !result.eventBus.ok
            ? "event_bus"
            : !faceReady
              ? "face_presence"
              : "notification_delivery";

    throw new ServiceUnavailableException({
      message: "Service dependencies or mandatory external adapters are not ready",
      error: ERROR_CODES.SERVICE_UNAVAILABLE,
      details: {
        dependency,
        ...result,
      },
    });
  }
}
