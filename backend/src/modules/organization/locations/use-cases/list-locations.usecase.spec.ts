import { ListLocationsUseCase } from "./list-locations.usecase";

describe(ListLocationsUseCase.name, () => {
  it("returns paginated location list", async () => {
    const repo = {
      findPaginated: jest.fn().mockResolvedValue({
        rows: [{ id: "loc-1", name: "HCMC Office" }],
        total: 1, page: 1, limit: 20,
      }),
    };
    const useCase = new ListLocationsUseCase(repo as any, {} as any);
    const result = await useCase.execute({ page: 1, limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.meta.pagination).toBeDefined();
  });
});
