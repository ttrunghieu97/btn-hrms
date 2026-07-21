import { CreateCertificationDefUseCase } from "./create-definition.usecase";

describe(CreateCertificationDefUseCase.name, () => {
  it("creates an active certification definition", async () => {
    const repo = {
      insertDef: jest.fn().mockResolvedValue({
        id: "def-1", name: "HR Pro", status: "active", createdAt: new Date("2026-07-17"),
      }),
    };
    const useCase = new CreateCertificationDefUseCase(repo as any);
    const result = await useCase.execute({ name: "HR Pro" });

    expect(repo.insertDef).toHaveBeenCalledWith({
      name: "HR Pro", description: null, issuer: null, validityMonths: null, status: "active",
    });
    expect(result.status).toBe("active");
  });

  it("rejects empty name", async () => {
    const useCase = new CreateCertificationDefUseCase({} as any);
    await expect(useCase.execute({ name: "" })).rejects.toThrow("Name is required");
  });
});
