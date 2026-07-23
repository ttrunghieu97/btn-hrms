import { Injectable } from "@nestjs/common";
import {
  CheckAttendanceUseCase,
  PunchVerificationContext,
} from "./check-attendance.usecase";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class CheckAttendanceFromWebUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly checkAttendance: CheckAttendanceUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, CheckAttendanceFromWebUseCase.name);
  }

  async execute(
    employeeId: string,
    date: string,
    session: "morning" | "noon" | "afternoon" | undefined,
    type: "checkin" | "checkout" | "check" | "note",
    image?: string,
    note?: string,
    latitude?: string,
    longitude?: string,
    location?: string,
    verification?: PunchVerificationContext,
    lunchDutyType?: "indoor" | "outdoor",
  ) {
    if (type === "check") {
      throwBadRequest(
        "Unsupported type 'check'. Use 'checkin' or 'checkout'.",
        ERROR_CODES.INVALID_REQUEST,
        { field: "type", value: "check" },
      );
    }

    const mapped =
      type === "checkin"
        ? "check_in"
        : type === "checkout"
          ? "check_out"
          : "note";

    if (mapped === "note" && !note?.trim()) {
      throwBadRequest("Note content is required", ERROR_CODES.NOTE_REQUIRED, {
        field: "note",
      });
    }

    return this.checkAttendance.execute(
      employeeId,
      mapped,
      image,
      location,
      note,
      session,
      date,
      latitude,
      longitude,
      verification,
      lunchDutyType,
    );
  }
}
