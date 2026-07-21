import { Injectable } from "@nestjs/common";
import { WorkforceIdentityAcl } from "../workforce-identity.acl";

@Injectable()
export class WorkforceIdentityAclImpl implements WorkforceIdentityAcl {
  mapToTimeEligibility(input: {
    employmentStatus: string;
    departmentId: string | null;
  }): {
    timeEligibilityStatus: "eligible" | "ineligible";
    departmentId: string | null;
  } {
    const normalized = String(input.employmentStatus || "").toLowerCase();
    const eligibleStatuses = new Set(["active", "working", "probation", "contract"]);

    return {
      timeEligibilityStatus: eligibleStatuses.has(normalized)
        ? "eligible"
        : "ineligible",
      departmentId: input.departmentId ?? null,
    };
  }
}
