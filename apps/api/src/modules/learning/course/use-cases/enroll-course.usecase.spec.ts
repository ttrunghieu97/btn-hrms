import { EnrollCourseUseCase } from "./enroll-course.usecase";

describe(EnrollCourseUseCase.name, () => {
  it("enrolls employee in a published course", async () => {
    const repo = {
      findCourseById: jest.fn().mockResolvedValue({ id: "c1", status: "published" }),
      insertEnrollment: jest.fn().mockResolvedValue({
        id: "enr-1", courseId: "c1", employeeId: "emp-1", status: "enrolled", progressPercent: 0,
      }),
    };
    const useCase = new EnrollCourseUseCase(repo as any);
    const result = await useCase.execute("c1", "emp-1");

    expect(result.status).toBe("enrolled");
    expect(repo.insertEnrollment).toHaveBeenCalledWith({
      courseId: "c1", employeeId: "emp-1", status: "enrolled",
    });
  });

  it("rejects enrollment when course is not published", async () => {
    const repo = {
      findCourseById: jest.fn().mockResolvedValue({ id: "c1", status: "draft" }),
    };
    const useCase = new EnrollCourseUseCase(repo as any);
    await expect(useCase.execute("c1", "emp-1")).rejects.toThrow("Course must be published");
  });

  it("rejects enrollment when course not found", async () => {
    const repo = { findCourseById: jest.fn().mockResolvedValue(null) };
    const useCase = new EnrollCourseUseCase(repo as any);
    await expect(useCase.execute("c1", "emp-1")).rejects.toThrow("Course not found");
  });
});
