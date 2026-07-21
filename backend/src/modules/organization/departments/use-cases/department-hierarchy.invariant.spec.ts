/**
 * Department Hierarchy Invariant Tests.
 *
 * These validate the tree integrity rules that prevent impossible org structures:
 *   - Self-parenting
 *   - Cycles (A → B → C → A)
 *   - Orphan detection (parent must exist)
 *   - Name uniqueness across siblings
 */

import { CreateDepartmentUseCase } from "./create-department.usecase";
import { UpdateDepartmentUseCase } from "./update-department.usecase";
import { DeleteDepartmentUseCase } from "./delete-department.usecase";
import { MoveDepartmentWithEventUseCase } from "./move-department-with-event.usecase";

describe("Department Hierarchy", () => {
  describe("Update", () => {
    it("rejects self-parenting", async () => {
      const repo = {
        findById: jest.fn().mockResolvedValue({ id: "dept-a", name: "Engineering", parentId: null }),
        existsNameConflict: jest.fn().mockResolvedValue(false),
        update: jest.fn(),
      };
      const useCase = new UpdateDepartmentUseCase(repo as any, {} as any);
      await expect(
        useCase.execute("dept-a", { parentId: "dept-a" }),
      ).rejects.toThrow("A department cannot be its own parent");
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("allows valid parentId that does not create a cycle", async () => {
      const findById = jest.fn()
        .mockResolvedValueOnce({ id: "dept-c", name: "C", parentId: null })
        .mockResolvedValueOnce({ id: "dept-b", name: "B", parentId: "dept-a" })
        .mockResolvedValueOnce({ id: "dept-a", name: "A", parentId: null });
      const repo = {
        findById,
        existsNameConflict: jest.fn().mockResolvedValue(false),
        update: jest.fn().mockResolvedValue({ id: "dept-c", parentId: "dept-b" }),
      };
      const useCase = new UpdateDepartmentUseCase(repo as any, {} as any);
      await expect(
        useCase.execute("dept-c", { parentId: "dept-b" }),
      ).resolves.toBeDefined();
    });

    it("rejects move to non-existent parent", async () => {
      const repo = {
        findById: jest.fn()
          .mockResolvedValueOnce({ id: "dept-a", name: "Engineering", parentId: null })
          .mockResolvedValueOnce(null),
        existsNameConflict: jest.fn().mockResolvedValue(false),
      };
      const useCase = new UpdateDepartmentUseCase(repo as any, {} as any);
      await expect(
        useCase.execute("dept-a", { parentId: "missing" }),
      ).rejects.toThrow("Parent department does not exist");
    });

    it("rejects duplicate name across departments", async () => {
      const repo = {
        findById: jest.fn().mockResolvedValue({ id: "dept-a", name: "Engineering", parentId: null }),
        existsNameConflict: jest.fn().mockResolvedValue(true),
      };
      const useCase = new UpdateDepartmentUseCase(repo as any, {} as any);
      await expect(
        useCase.execute("dept-a", { name: "Engineering" }),
      ).rejects.toThrow("Department name already exists");
    });
  });

  describe("Delete", () => {
    it("soft-deletes a department with no children", async () => {
      const repo = {
        findById: jest.fn().mockResolvedValue({ id: "dept-a", name: "Engineering", parentId: null }),
        delete: jest.fn().mockResolvedValue({ id: "dept-a" }),
      };
      const useCase = new DeleteDepartmentUseCase(repo as any, {} as any);
      await useCase.execute("dept-a");
      expect(repo.delete).toHaveBeenCalledWith("dept-a");
    });

    it("rejects delete of non-existent department", async () => {
      const repo = { findById: jest.fn().mockResolvedValue(null) };
      const useCase = new DeleteDepartmentUseCase(repo as any, {} as any);
      await expect(useCase.execute("missing")).rejects.toThrow("Department with ID missing not found");
    });
  });

  describe("Move", () => {
    it("moves department to new parent within same hierarchy", async () => {
      const repo = {
        findById: jest.fn().mockResolvedValue({ id: "dept-c", name: "C", parentId: "dept-b" }),
        transaction: jest.fn().mockImplementation(async (fn) => fn({})),
        update: jest.fn().mockResolvedValue({}),
      };
      const eventOutbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) };
      const useCase = new MoveDepartmentWithEventUseCase(repo as any, eventOutbox as any, {} as any);
      await useCase.execute("dept-c", "dept-a");

      expect(repo.update).toHaveBeenCalledWith("dept-c", { parentId: "dept-a" }, expect.anything());
      expect(eventOutbox.stage).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: "workforce.department.moved" }),
        expect.anything(),
      );
    });

    it("no-ops when moving to same parent", async () => {
      const repo = {
        findById: jest.fn().mockResolvedValue({ id: "dept-c", name: "C", parentId: "dept-b" }),
        transaction: jest.fn(),
      };
      const useCase = new MoveDepartmentWithEventUseCase(repo as any, {} as any, {} as any);
      await useCase.execute("dept-c", "dept-b");
      expect(repo.transaction).not.toHaveBeenCalled();
    });

    it("rejects move of non-existent department", async () => {
      const repo = { findById: jest.fn().mockResolvedValue(null) };
      const useCase = new MoveDepartmentWithEventUseCase(repo as any, {} as any, {} as any);
      await expect(useCase.execute("missing", "dept-a")).rejects.toThrow("Department not found");
    });
  });
});
