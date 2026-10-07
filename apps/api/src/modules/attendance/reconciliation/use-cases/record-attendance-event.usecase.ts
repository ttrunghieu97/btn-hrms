import { Injectable } from "@nestjs/common";
import { AttendanceEventRepository } from "../repositories/attendance-event.repository";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

export interface RecordEventInput {
  employeeId: string;
  type: "CLOCK_IN" | "CLOCK_OUT";
  timestamp: string;
  source?: "DEVICE" | "MANUAL";
  locationId?: string;
}

@Injectable()
export class RecordAttendanceEventUseCase {
  constructor(
    private readonly eventRepo: AttendanceEventRepository,
  ) {}

  async execute(input: RecordEventInput) {
    if (!input.employeeId || !input.type || !input.timestamp) {
      throwBadRequest(
        "employeeId, type, and timestamp are required",
        ERROR_CODES.INVALID_REQUEST,
        input,
      );
    }

    if (input.type !== "CLOCK_IN" && input.type !== "CLOCK_OUT") {
      throwBadRequest(
        "type must be CLOCK_IN or CLOCK_OUT",
        ERROR_CODES.INVALID_REQUEST,
        { type: input.type },
      );
    }

    const ts = new Date(input.timestamp);
    if (Number.isNaN(ts.getTime())) {
      throwBadRequest(
        "Invalid timestamp format",
        ERROR_CODES.INVALID_REQUEST,
        { timestamp: input.timestamp },
      );
    }

    const row = await this.eventRepo.insert({
      employeeId: input.employeeId,
      type: input.type,
      timestamp: ts,
      source: input.source ?? "MANUAL",
      locationId: input.locationId ?? null,
    });

    return { data: row, error: null };
  }
}
