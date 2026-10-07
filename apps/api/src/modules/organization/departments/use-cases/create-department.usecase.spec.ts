import { NotFoundException } from "@nestjs/common";
import { CreateDepartmentUseCase } from "./create-department.usecase";

describe("CreateDepartmentUseCase", () => {
  it("rejects when parent department does not exist", async () => {
    const repo = {
      findByName: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    };

    const useCase = new CreateDepartmentUseCase(repo as any, {} as any);

    await expect(
      useCase.execute({ name: "Engineering", parentId: "missing" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
