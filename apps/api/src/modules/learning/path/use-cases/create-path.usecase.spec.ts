import { CreatePathUseCase } from "./create-path.usecase";

describe(CreatePathUseCase.name, () => {
  it("creates a draft path with linked courses", async () => {
    const repo = {
      insertPath: jest.fn().mockResolvedValue({ id: "path-1", name: "HR Track", status: "draft" }),
      addPathCourse: jest.fn().mockResolvedValue({}),
    };
    const useCase = new CreatePathUseCase(repo as any);
    const result = await useCase.execute({ name: "HR Track", courses: ["c1", "c2"] });

    expect(repo.insertPath).toHaveBeenCalledWith({
      name: "HR Track", description: null, status: "draft",
    });
    expect(repo.addPathCourse).toHaveBeenCalledTimes(2);
    expect(result.name).toBe("HR Track");
    expect(result.status).toBe("draft");
  });

  it("creates a draft path without courses", async () => {
    const repo = {
      insertPath: jest.fn().mockResolvedValue({ id: "path-2", name: "Empty Path", status: "draft" }),
      addPathCourse: jest.fn(),
    };
    const useCase = new CreatePathUseCase(repo as any);
    const result = await useCase.execute({ name: "Empty Path" });

    expect(repo.addPathCourse).not.toHaveBeenCalled();
    expect(result.name).toBe("Empty Path");
  });

  it("rejects empty name", async () => {
    const useCase = new CreatePathUseCase({} as any);
    await expect(useCase.execute({ name: "" })).rejects.toThrow("Name is required");
  });
});
