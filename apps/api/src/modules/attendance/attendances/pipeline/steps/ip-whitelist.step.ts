import { Injectable } from "@nestjs/common";
import { MetricsService } from "../../../../../shared/metrics/metrics.service";
import { throwBadRequest } from "../../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../../shared/constants/error-codes";
import type { VerificationStep, StepResult } from "../verification-step.interface";
import type { AttendanceVerificationContext } from "../verification-context";
import { IpWhitelistService } from "../../services/ip-whitelist.service";

@Injectable()
export class IpWhitelistStep implements VerificationStep {
  readonly name = "ip_whitelist";
  constructor(
    private readonly ipWhitelist: IpWhitelistService,
    private readonly metrics: MetricsService,
  ) {}

  async execute(ctx: AttendanceVerificationContext): Promise<StepResult> {
    const allowedCidrs = ctx.employeeContext?.currentSite?.allowedIpCidrs ?? null;
    if (!allowedCidrs || allowedCidrs.length === 0) return {};
    const ipOk = this.ipWhitelist.isAllowed(ctx.ipAddress ?? null, allowedCidrs);
    if (!ipOk) {
      this.metrics.incrementAttendanceIpFail();
      throwBadRequest(
        "Your network is not authorised",
        ERROR_CODES.IP_NOT_WHITELISTED,
        { siteId: ctx.employeeContext?.currentSite?.id ?? null },
      );
    }
    return {};
  }
}
