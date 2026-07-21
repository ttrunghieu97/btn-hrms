import { ListCertificationDefsUseCase } from "./list-definitions.usecase";

describe(ListCertificationDefsUseCase.name, () => {
  it("returns all certification definitions", async () => {
    const repo = {
      findDefs: jest.fn().mockResolvedValue([
        { id: "def-1", name: "HR Pro", status: "active" },
        { id: "def-2", name: "Payroll Expert", status: "active" },
      ]),
    };
    const useCase = new ListCertificationDefsUseCase(repo as any);
    const result = await useCase.execute();
    expect(result).toHaveLength(2);
  });
});
