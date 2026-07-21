import { CreatePositionUseCase } from "./create-position.usecase";

describe(CreatePositionUseCase.name, () => {
  it("creates position and stages event inside transaction", async () => {
    const repo = {
      findActiveByTitle: jest.fn().mockResolvedValue(null),
      transaction: jest.fn().mockImplementation(async (fn) => {
        const tx = {} as any;
        const mockCreate = jest.fn().mockResolvedValue("pos-1");
        repo.createPosition = mockCreate;
        return fn(tx);
      }),
      createPosition: jest.fn().mockResolvedValue("pos-1"),
    };
    const eventOutbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) };
    const useCase = new CreatePositionUseCase(repo as any, eventOutbox as any, {} as any);
    const result = await useCase.execute({ name: "Software Engineer" });

    expect(result).toBe("pos-1");
  });

  it("rejects duplicate position name", async () => {
    const repo = {
      findActiveByTitle: jest.fn().mockResolvedValue({ id: "existing", name: "Software Engineer" }),
    };
    const useCase = new CreatePositionUseCase(repo as any, {} as any, {} as any);
    await expect(
      useCase.execute({ name: "Software Engineer" }),
    ).rejects.toThrow("Position name already exists");
  });
});
