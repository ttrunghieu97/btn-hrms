import { ListCoursesUseCase } from "./list-courses.usecase";

describe(ListCoursesUseCase.name, () => {
  it("returns empty list when no courses exist", async () => {
    const repo = { findCourses: jest.fn().mockResolvedValue([]) };
    const useCase = new ListCoursesUseCase(repo as any);
    const result = await useCase.execute();
    expect(result).toEqual([]);
  });

  it("maps all course fields correctly", async () => {
    const repo = {
      findCourses: jest.fn().mockResolvedValue([
        { id: "c1", title: "A", status: "draft", estimatedHours: null },
        { id: "c2", title: "B", status: "published", estimatedHours: 5 },
      ]),
    };
    const useCase = new ListCoursesUseCase(repo as any);
    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    expect(result[1]!.estimatedHours).toBe(5);
    expect(result[0]!.id).toBe("c1");
  });
});
