import { Injectable } from "@nestjs/common";
import { TimekeepingExceptionType } from "../repositories/attendance-timekeeping.repository.contract";

@Injectable()
export class AttendanceExceptionDetectorService {
  detect(params: {
    hasCheckIn: boolean;
    hasCheckOut: boolean;
    invalidSequence: boolean;
    hasShiftAssignment: boolean;
  }): TimekeepingExceptionType[] {
    const exceptions = new Set<TimekeepingExceptionType>();

    if (params.hasCheckIn !== params.hasCheckOut) {
      exceptions.add("missing_punch");
    }

    if (params.invalidSequence) {
      exceptions.add("invalid_sequence");
    }

    if (
      (params.hasCheckIn || params.hasCheckOut) &&
      !params.hasShiftAssignment
    ) {
      exceptions.add("off_shift");
    }

    return [...exceptions];
  }
}



