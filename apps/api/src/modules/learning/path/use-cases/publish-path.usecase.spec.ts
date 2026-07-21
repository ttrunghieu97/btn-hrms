import { PublishPathUseCase } from "./publish-path.usecase";

describe(PublishPathUseCase.name, () => {
  it("publishes a draft path", async () => {
    const repo = {
      findPathById: jest.fn().mockResolvedValue({ id: "path-1", status: "draft" }),
      updatePath: jest.fn().mockResolvedValue({}),
    };
    const useCase = new PublishPathUseCase(repo as any);
    await useCase.execute("path-1");

    expect(repo.updatePath).toHaveBeenCalledWith("path-1", { status: "published" });
  });

  it("rejects publish of already published path", async () => {
    const repo = { findPathById: jest.fn().mockResolvedValue({ id: "path-1", status: "published" }) };
    const useCase = new PublishPathUseCase(repo as any);
    await expect(useCase.execute("path-1")).rejects.toThrow("Only draft paths can be published");
  });
});
