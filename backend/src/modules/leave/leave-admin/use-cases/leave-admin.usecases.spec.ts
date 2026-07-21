import { Test } from "@nestjs/testing";
import { ListLeavePoliciesUseCase, CreateLeavePolicyUseCase, UpdateLeavePolicyUseCase, ListLeaveTypesUseCase, CreateLeaveTypeUseCase, UpdateLeaveTypeUseCase } from "./leave-admin.usecases";
import { LeaveAdminRepository } from "../repositories/leave-admin.repository";

describe("LeaveAdmin", () => {
  describe(ListLeavePoliciesUseCase.name, () => {
    it("lists leave policies", async () => {
      const repo = { listLeavePolicies: jest.fn().mockResolvedValue({ rows: [], total: 0 }) } as any;
      const useCase = new ListLeavePoliciesUseCase(repo);
      const result = await useCase.execute({});
      expect(result.total).toBe(0);
    });
  });

  describe(CreateLeavePolicyUseCase.name, () => {
    it("creates a leave policy", async () => {
      const repo = { create: jest.fn().mockResolvedValue({ id: "pol-1" }) } as any;
      const useCase = new CreateLeavePolicyUseCase(repo);
      const result = await useCase.execute({ name: "Standard", effectiveFrom: "2026-01-01" });
      expect(result.id).toBe("pol-1");
    });

    it("rejects invalid date range", async () => {
      const useCase = new CreateLeavePolicyUseCase({} as any);
      await expect(
        useCase.execute({ name: "Bad", effectiveFrom: "2026-06-01", effectiveTo: "2026-01-01" }),
      ).rejects.toThrow("Invalid leave policy date range");
    });
  });

  describe(UpdateLeavePolicyUseCase.name, () => {
    it("updates a leave policy", async () => {
      const repo = {
        getLeavePolicy: jest.fn().mockResolvedValue({ id: "pol-1", effectiveFrom: "2026-01-01" }),
        update: jest.fn().mockResolvedValue({ id: "pol-1" }),
      } as any;
      const useCase = new UpdateLeavePolicyUseCase(repo);
      const result = await useCase.execute("pol-1", { name: "Updated" });
      expect(result.id).toBe("pol-1");
    });

    it("throws when policy not found", async () => {
      const repo = { getLeavePolicy: jest.fn().mockResolvedValue(null) } as any;
      const useCase = new UpdateLeavePolicyUseCase(repo);
      await expect(useCase.execute("missing", {})).rejects.toThrow("Leave policy not found");
    });
  });

  describe(ListLeaveTypesUseCase.name, () => {
    it("lists leave types", async () => {
      const repo = { listLeaveTypes: jest.fn().mockResolvedValue({ rows: [], total: 0 }) } as any;
      const useCase = new ListLeaveTypesUseCase(repo);
      const result = await useCase.execute({});
      expect(result.total).toBe(0);
    });
  });

  describe(CreateLeaveTypeUseCase.name, () => {
    it("creates a leave type", async () => {
      const repo = { create: jest.fn().mockResolvedValue({ id: "type-1" }) } as any;
      const useCase = new CreateLeaveTypeUseCase(repo);
      const result = await useCase.execute({ name: "Annual", unit: "day" });
      expect(result.id).toBe("type-1");
    });
  });

  describe(UpdateLeaveTypeUseCase.name, () => {
    it("updates a leave type", async () => {
      const repo = {
        getLeaveType: jest.fn().mockResolvedValue({ id: "type-1" }),
        update: jest.fn().mockResolvedValue({ id: "type-1" }),
      } as any;
      const useCase = new UpdateLeaveTypeUseCase(repo);
      const result = await useCase.execute("type-1", { name: "Updated" });
      expect(result.id).toBe("type-1");
    });

    it("throws when type not found", async () => {
      const repo = { getLeaveType: jest.fn().mockResolvedValue(null) } as any;
      const useCase = new UpdateLeaveTypeUseCase(repo);
      await expect(useCase.execute("missing", {})).rejects.toThrow("Leave type not found");
    });
  });
});
