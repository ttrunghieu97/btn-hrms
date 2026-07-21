import { Injectable } from "@nestjs/common";
import { MetricsService } from "../../../../../shared/metrics/metrics.service";
import { throwBadRequest } from "../../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../../shared/constants/error-codes";
import type { VerificationStep, StepResult } from "../verification-step.interface";
import type { AttendanceVerificationContext } from "../verification-context";

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const f1 = (lat1 * Math.PI) / 180;
  const f2 = (lat2 * Math.PI) / 180;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class GeofenceStep implements VerificationStep {
  readonly name = "geofence";

  constructor(private readonly metrics: MetricsService) {}

  async execute(ctx: AttendanceVerificationContext): Promise<StepResult> {
    const { employeeContext, latitude, longitude } = ctx;
    const site = employeeContext?.currentSite;
    if (!latitude || !longitude || !site?.latitude || !site?.longitude || !site?.radiusMeters) {
      return {};
    }
    const distance = calculateDistance(
      Number(latitude), Number(longitude),
      Number(site.latitude), Number(site.longitude),
    );
    ctx.distanceMeters = Math.round(distance);
    if (distance > site.radiusMeters) {
      this.metrics.incrementAttendanceGeoFail(site.id);
      throwBadRequest(
        "You are outside the allowed work area",
        ERROR_CODES.GEOFENCE_VIOLATION,
        { distance: Math.round(distance), radius: site.radiusMeters, siteId: site.id },
      );
    }
    return {};
  }
}
