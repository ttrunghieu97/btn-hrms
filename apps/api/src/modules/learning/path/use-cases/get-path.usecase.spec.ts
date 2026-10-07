import { GetPathUseCase } from "./get-path.usecase";

describe(GetPathUseCase.name, () => {
  it("returns path when found", async () => {
    const repo = {
      findPathById: jest.fn().mockResolvedValue({ id: "path-1", name: "HR Track", status: "published" }),
    };
    const useCase = new GetPathUseCase(repo as any);
    const result = await useCase.execute("path-1");

    expect(result.name).toBe("HR Track");
    expect(result.status).toBe("published");
  });

  it("throws when path not found", async () => {
    const repo = { findPathById: jest.fn().mockResolvedValue(null) };
    const useCase = new GetPathUseCase(repo as any);
    await expect(useCase.execute("path-1")).rejects.toThrow("Path not found");
  });
});
