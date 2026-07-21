import { ListLocationsFlatUseCase } from "./list-locations-flat.usecase";

describe(ListLocationsFlatUseCase.name, () => {
  it("returns flat location list", async () => {
    const repo = {
      findList: jest.fn().mockResolvedValue([
        { id: "loc-1", name: "HCMC Office" },
      ]),
    };
    const useCase = new ListLocationsFlatUseCase(repo as any, {} as any);
    const result = await useCase.execute({ page: 1, limit: 20 });

    expect(result).toHaveLength(1);
  });
});
