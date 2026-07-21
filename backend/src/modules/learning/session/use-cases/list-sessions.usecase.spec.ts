import { ListSessionsUseCase } from "./list-sessions.usecase";

describe(ListSessionsUseCase.name, () => {
  it("returns sessions for a course", async () => {
    const repo = {
      findByCourse: jest.fn().mockResolvedValue([
        { id: "sess-1", courseId: "c1", title: "Week 1", status: "published",
          scheduledAt: new Date("2026-08-01T09:00:00Z"), durationMinutes: 60 },
      ]),
    };
    const useCase = new ListSessionsUseCase(repo as any);
    const result = await useCase.execute("c1");

    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe("Week 1");
    expect(result[0]!.durationMinutes).toBe(60);
  });

  it("returns empty list for course with no sessions", async () => {
    const repo = { findByCourse: jest.fn().mockResolvedValue([]) };
    const useCase = new ListSessionsUseCase(repo as any);
    const result = await useCase.execute("c1");
    expect(result).toEqual([]);
  });
});
