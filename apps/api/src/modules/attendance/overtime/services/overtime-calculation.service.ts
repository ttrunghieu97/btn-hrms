import { Injectable } from "@nestjs/common";

export interface AttendanceMetrics {
  workedMinutes: number;
  scheduledMinutes: number;
  isHoliday?: boolean;
  isRestDay?: boolean;
}

@Injectable()
export class OvertimeCalculationService {
  /**
   * Calculates candidate overtime minutes based on worked vs scheduled minutes.
   * Standard rule: candidateOvertime = max(0, workedMinutes - scheduledMinutes)
   * If holiday or rest day, calculation might differ (e.g. all worked minutes are OT),
   * but we follow the baseline spec for now: traceable to worked and scheduled values.
   */
  calculateCandidateMinutes(metrics: AttendanceMetrics): number {
    const { workedMinutes, scheduledMinutes } = metrics;

    // Requirement: Candidate overtime MUST be non-negative.
    if (workedMinutes <= scheduledMinutes) {
      return 0;
    }

    const candidate = workedMinutes - scheduledMinutes;

    // Note: Future logic for holiday/rest-day multipliers or 100% OT coverage
    // can be added here. For now, we return the delta as specified.
    return Math.max(0, candidate);
  }
}



