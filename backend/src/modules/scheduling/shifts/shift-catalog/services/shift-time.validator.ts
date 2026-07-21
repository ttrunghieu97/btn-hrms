import { throwBadRequest } from "../../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../../shared/constants/error-codes";

function toSeconds(time: string): number {
  const parts = time.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const s = parts[2] ?? 0;
  return h * 3600 + m * 60 + s;
}

export function validateShiftTemplateTimes(params: {
  startTime: string;
  endTime: string;
  overnight?: boolean;
}): void {
  const { startTime, endTime, overnight = false } = params;
  const startSeconds = toSeconds(startTime);
  const endSeconds = toSeconds(endTime);

  if (startSeconds === endSeconds) {
    throwBadRequest(
      "Shift start and end times cannot be identical",
      ERROR_CODES.SHIFT_TIME_IDENTICAL,
    );
  }

  if (!overnight && endSeconds <= startSeconds) {
    throwBadRequest(
      "Non-overnight shifts must end after start time",
      ERROR_CODES.SHIFT_TIME_INVALID_ORDER,
    );
  }

  if (overnight && endSeconds >= startSeconds) {
    throwBadRequest(
      "Overnight shifts must end before start time",
      ERROR_CODES.SHIFT_TIME_INVALID_ORDER,
    );
  }
}

export function calculateScheduledMinutes(params: {
  startTime: string;
  endTime: string;
  overnight?: boolean;
  breakMinutes?: number;
}): number {
  const { startTime, endTime, overnight = false, breakMinutes = 0 } = params;
  const startSeconds = toSeconds(startTime);
  const endSeconds = toSeconds(endTime);

  const rawSeconds = overnight
    ? 24 * 3600 - startSeconds + endSeconds
    : endSeconds - startSeconds;

  const rawMinutes = Math.floor(rawSeconds / 60);
  return Math.max(0, rawMinutes - breakMinutes);
}

