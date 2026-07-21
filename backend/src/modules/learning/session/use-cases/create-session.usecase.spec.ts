import { CreateSessionUseCase } from "./create-session.usecase";

describe(CreateSessionUseCase.name, () => {
  it("creates a draft session for a published course", async () => {
    const sessionRepo = {
      insert: jest.fn().mockResolvedValue({
        id: "sess-1", courseId: "c1", title: "Week 1", status: "draft",
        scheduledAt: new Date("2026-08-01T09:00:00Z"), durationMinutes: 60,
      }),
    };
    const courseRepo = {
      findCourseById: jest.fn().mockResolvedValue({ id: "c1", status: "published" }),
    };
    const useCase = new CreateSessionUseCase(sessionRepo as any, courseRepo as any);
    const result = await useCase.execute({
      courseId: "c1", title: "Week 1", scheduledAt: "2026-08-01T09:00:00Z",
    });

    expect(result.title).toBe("Week 1");
    expect(result.status).toBe("draft");
    expect(sessionRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ courseId: "c1", status: "draft" }),
    );
  });

  it("rejects empty title", async () => {
    const useCase = new CreateSessionUseCase({} as any, {} as any);
    await expect(useCase.execute({
      courseId: "c1", title: "", scheduledAt: "2026-08-01T09:00:00Z",
    })).rejects.toThrow("Title is required");
  });

  it("rejects session for non-existent course", async () => {
    const courseRepo = { findCourseById: jest.fn().mockResolvedValue(null) };
    const useCase = new CreateSessionUseCase({} as any, courseRepo as any);
    await expect(useCase.execute({
      courseId: "c1", title: "Week 1", scheduledAt: "2026-08-01T09:00:00Z",
    })).rejects.toThrow("Course not found");
  });
});
