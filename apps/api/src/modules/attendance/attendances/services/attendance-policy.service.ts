import { Injectable } from "@nestjs/common";

/**
 * AttendancePolicyService — single source of attendance business rules.
 *
 * Phase 1: simple boolean, allows check-in without shift.
 * Phase 2+: per-company/site/tenant config from DB or config store.
 *
 * Architecture note:
 *   GetTodayAttendanceUseCase returns NO_SHIFT state unconditionally.
 *   This policy only controls whether check-in is *allowed* in NO_SHIFT state.
 *   FE shows "Không có ca" info + disabled button when canCheckIn=false.
 */
@Injectable()
export class AttendancePolicyService {
  /**
   * When true, employees can check in/out even when no shift/site is assigned.
   * When false, employees must have a shift assignment to record attendance.
   *
   * Switch to per-company resolver when multi-tenant/multi-policy is needed:
   *   const policy = await this.resolver.resolve(companyId);
   *   return policy.allowCheckInWithoutShift;
   */
  get allowCheckInWithoutShift(): boolean {
    return true;
  }
}
