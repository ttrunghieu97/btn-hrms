import { BadRequestException, ConflictException } from "@nestjs/common";
import { UpdateDepartmentUseCase } from "./update-department.usecase";

describe("UpdateDepartmentUseCase", () => {
  it("rejects self-parent assignment", async () => {
    const repo = {
      findById: jest
        .fn()
        .mockResolvedValueOnce({ id: "dept-a", parentId: null }),
      update: jest.fn(),
    };

    const useCase = new UpdateDepartmentUseCase(repo as any, {} as any);

    await expect(
      useCase.execute("dept-a", { parentId: "dept-a" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("rejects cyclic hierarchy updates", async () => {
    const repo = {
      findById: jest
        .fn()
        // existing target department
        .mockResolvedValueOnce({ id: "dept-a", parentId: null })
        // direct parent exists
        .mockResolvedValueOnce({ id: "dept-b", parentId: "dept-a" })
        // chain walk reaches dept-a => cycle
        .mockResolvedValueOnce({ id: "dept-b", parentId: "dept-a" }),
      update: jest.fn(),
    };

    const useCase = new UpdateDepartmentUseCase(repo as any, {} as any);

    await expect(
      useCase.execute("dept-a", { parentId: "dept-b" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("maps duplicate name violation to conflict", async () => {
    class MockPgError extends Error {
      code = "23505";
      detail = "Key (name)=(Engineering) already exists.";
      constraint = "departments_name_unique";
      cause = null;
    }
    const duplicateErr = new MockPgError("Unique violation");
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "dept-a", parentId: null }),
      existsNameConflict: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockRejectedValue(duplicateErr),
    };

    const useCase = new UpdateDepartmentUseCase(repo as any, {} as any);

    await expect(
      useCase.execute("dept-a", { name: "Engineering" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
