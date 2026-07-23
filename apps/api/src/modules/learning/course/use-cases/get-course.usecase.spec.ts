import { GetCourseUseCase } from "./get-course.usecase";

describe(GetCourseUseCase.name, () => {
  it("returns course when found", async () => {
    const repo = {
      findCourseById: jest.fn().mockResolvedValue({
        id: "c1", title: "HR Basics", status: "published", estimatedHours: null,
      }),
    };
    const useCase = new GetCourseUseCase(repo as any);
    const result = await useCase.execute("c1");

    expect(result.title).toBe("HR Basics");
    expect(result.status).toBe("published");
  });

  it("throws when course not found", async () => {
    const repo = { findCourseById: jest.fn().mockResolvedValue(null) };
    const useCase = new GetCourseUseCase(repo as any);
    await expect(useCase.execute("c1")).rejects.toThrow("Course not found");
  });
});
