export interface WorkforceIdentityAcl {
  mapToTimeEligibility(input: {
    employmentStatus: string;
    departmentId: string | null;
  }): {
    timeEligibilityStatus: "eligible" | "ineligible";
    departmentId: string | null;
  };
}
