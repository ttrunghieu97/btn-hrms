import { OffboardingController } from "./offboarding.controller";
import { Permissions } from "../../core/security/permissions/permissions.registry";

describe("OffboardingController Segregation of Duties", () => {
  let controller: OffboardingController;
  let mockDecideClearanceUseCase: any;

  beforeEach(() => {
    mockDecideClearanceUseCase = {
      execute: jest.fn().mockResolvedValue({ id: "c-1", decision: "approved" }),
    };

    controller = new OffboardingController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      mockDecideClearanceUseCase,
      {} as any,
    );
  });

  it("denies IT clearance decision when user only has HR clearance permission", async () => {
    const hrUser = {
      id: "hr-user",
      permissions: [Permissions.OFFBOARDING_CLEARANCE_HR],
      isSuperAdmin: false,
    };

    await expect(
      controller.decideClearance(
        "proc-1",
        "it",
        { decision: "approved" },
        { user: hrUser } as any,
      ),
    ).rejects.toThrow("Insufficient permissions to decide it clearance");

    expect(mockDecideClearanceUseCase.execute).not.toHaveBeenCalled();
  });

  it("allows IT clearance decision when user has IT clearance permission", async () => {
    const itUser = {
      id: "it-user",
      permissions: [Permissions.OFFBOARDING_CLEARANCE_IT],
      isSuperAdmin: false,
    };

    const res = await controller.decideClearance(
      "proc-1",
      "it",
      { decision: "approved" },
      { user: itUser } as any,
    );

    expect(res.data).toEqual({ id: "c-1", decision: "approved" });
    expect(mockDecideClearanceUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        processId: "proc-1",
        department: "it",
        decision: "approved",
      }),
    );
  });

  it("allows clearance decision for super admin", async () => {
    const superAdmin = {
      id: "admin-user",
      permissions: [],
      isSuperAdmin: true,
    };

    const res = await controller.decideClearance(
      "proc-1",
      "finance",
      { decision: "approved" },
      { user: superAdmin } as any,
    );

    expect(res.data).toEqual({ id: "c-1", decision: "approved" });
  });
});
