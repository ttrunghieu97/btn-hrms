import { EmployeeLifecycleService } from "./employee-lifecycle.service";
import { throwBadRequest } from "../../../../shared/utils/http-error";

describe("EmployeeLifecycleService", () => {
  let service: EmployeeLifecycleService;
  let deptRepo: any;
  let posRepo: any;
  let empRepo: any;

  beforeEach(() => {
    deptRepo = { findById: jest.fn() };
    posRepo = { findById: jest.fn() };
    empRepo = {
      findByIdentifier: jest.fn(),
      findCurrentOrgAssignment: jest.fn(),
    };
    const ctx = { get: jest.fn() };
    const outbox = { stage: jest.fn() };
    service = new EmployeeLifecycleService(
      empRepo,
      ctx as any,
      outbox as any,
      deptRepo,
      posRepo,
    );
  });

  // ─── Org Reference Validation ────────────────────────────────────
  describe("assertOrgRefsAreValid", () => {
    it("accepts valid department, position, manager", async () => {
      deptRepo.findById.mockResolvedValue({ id: "dept-1", deletedAt: null });
      posRepo.findById.mockResolvedValue({ id: "pos-1", isActive: true });
      empRepo.findByIdentifier.mockResolvedValue({ id: "mgr-1", deletedAt: null, status: "working" });
      await expect(
        service.assertOrgRefsAreValid({ departmentId: "dept-1", positionId: "pos-1", managerEmployeeId: "mgr-1" }),
      ).resolves.toBeUndefined();
    });

    it("rejects missing department", async () => {
      deptRepo.findById.mockResolvedValue(null);
      await expect(
        service.assertOrgRefsAreValid({ departmentId: "missing" }),
      ).rejects.toThrow();
    });

    it("rejects deleted department", async () => {
      deptRepo.findById.mockResolvedValue({ id: "dept-1", deletedAt: new Date() });
      await expect(
        service.assertOrgRefsAreValid({ departmentId: "dept-1" }),
      ).rejects.toThrow();
    });

    it("rejects inactive position", async () => {
      posRepo.findById.mockResolvedValue({ id: "pos-1", isActive: false });
      await expect(
        service.assertOrgRefsAreValid({ positionId: "pos-1" }),
      ).rejects.toThrow();
    });

    it("rejects archived manager", async () => {
      empRepo.findByIdentifier.mockResolvedValue({ id: "mgr-1", deletedAt: new Date(), status: "working" });
      await expect(
        service.assertOrgRefsAreValid({ managerEmployeeId: "mgr-1" }),
      ).rejects.toThrow();
    });

    it("rejects terminated manager", async () => {
      empRepo.findByIdentifier.mockResolvedValue({ id: "mgr-1", deletedAt: null, status: "terminated" });
      await expect(
        service.assertOrgRefsAreValid({ managerEmployeeId: "mgr-1" }),
      ).rejects.toThrow();
    });
  });

  // ─── Manager Hierarchy Guard is now in EmployeeHierarchyGuard ────
});
