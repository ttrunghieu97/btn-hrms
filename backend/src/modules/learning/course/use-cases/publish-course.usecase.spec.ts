import { PublishCourseUseCase } from "./publish-course.usecase";

describe(PublishCourseUseCase.name, () => {
  it("publishes a draft course", async () => {
    const repo = {
      findCourseById: jest.fn().mockResolvedValue({ id: "c1", status: "draft" }),
      updateCourse: jest.fn().mockResolvedValue({ id: "c1", status: "published" }),
    };
    const useCase = new PublishCourseUseCase(repo as any);
    await useCase.execute("c1");

    expect(repo.updateCourse).toHaveBeenCalledWith("c1", { status: "published" });
  });

  it("rejects publish of already published course", async () => {
    const repo = {
      findCourseById: jest.fn().mockResolvedValue({ id: "c1", status: "published" }),
    };
    const useCase = new PublishCourseUseCase(repo as any);
    await expect(useCase.execute("c1")).rejects.toThrow("Only draft courses can be published");
  });

  it("rejects publish of non-existent course", async () => {
    const repo = { findCourseById: jest.fn().mockResolvedValue(null) };
    const useCase = new PublishCourseUseCase(repo as any);
    await expect(useCase.execute("c1")).rejects.toThrow("Course not found");
  });
});
