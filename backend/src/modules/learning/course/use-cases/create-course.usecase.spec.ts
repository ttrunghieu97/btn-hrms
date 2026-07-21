import { CreateCourseUseCase } from "./create-course.usecase";

describe(CreateCourseUseCase.name, () => {
  it("creates a draft course from valid input", async () => {
    const repo = {
      insertCourse: jest.fn().mockResolvedValue({
        id: "course-1", title: "Intro to HR", description: null, status: "draft", estimatedHours: null,
      }),
    };
    const useCase = new CreateCourseUseCase(repo as any);
    const result = await useCase.execute({ title: "Intro to HR" });

    expect(repo.insertCourse).toHaveBeenCalledWith({
      title: "Intro to HR", description: null, status: "draft", estimatedHours: null,
    });
    expect(result).toEqual({
      id: "course-1", title: "Intro to HR", status: "draft", estimatedHours: null,
    });
  });

  it("rejects empty title", async () => {
    const useCase = new CreateCourseUseCase({} as any);
    await expect(useCase.execute({ title: "" })).rejects.toThrow("Title is required");
  });

  it("creates course with optional fields", async () => {
    const repo = {
      insertCourse: jest.fn().mockResolvedValue({
        id: "course-2", title: "Advanced Payroll", description: "Deep dive", status: "draft", estimatedHours: 10,
      }),
    };
    const useCase = new CreateCourseUseCase(repo as any);
    const result = await useCase.execute({ title: "Advanced Payroll", description: "Deep dive", estimatedHours: 10 });

    expect(repo.insertCourse).toHaveBeenCalledWith({
      title: "Advanced Payroll", description: "Deep dive", status: "draft", estimatedHours: 10,
    });
    expect(result.estimatedHours).toBe(10);
  });
});
