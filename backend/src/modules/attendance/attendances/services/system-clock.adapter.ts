import { Injectable } from "@nestjs/common";
import { todayDateString } from "../../../../shared/utils/date-format";
import type { ClockPort } from "../ports/clock.port";

/**
 * System clock adapter — uses real system time.
 * Inject this in production; replace with a mock in tests.
 */
@Injectable()
export class SystemClockAdapter implements ClockPort {
  now(): Date {
    return new Date();
  }

  nowIso(): string {
    return new Date().toISOString();
  }

  today(): string {
    return todayDateString();
  }

  nowMs(): number {
    return performance.now();
  }

  nowEpochMs(): number {
    return Date.now();
  }
}
