import { WorkforceIdentityAclImpl } from "./workforce-identity.acl.impl";

describe("WorkforceIdentityAclImpl", () => {
  const acl = new WorkforceIdentityAclImpl();

  it("maps active employee to eligible", () => {
    const result = acl.mapToTimeEligibility({
      employmentStatus: "active",
      departmentId: "dep-1",
    });

    expect(result).toEqual({
      timeEligibilityStatus: "eligible",
      departmentId: "dep-1",
    });
  });

  it("maps terminated employee to ineligible", () => {
    const result = acl.mapToTimeEligibility({
      employmentStatus: "terminated",
      departmentId: null,
    });

    expect(result).toEqual({
      timeEligibilityStatus: "ineligible",
      departmentId: null,
    });
  });
});
