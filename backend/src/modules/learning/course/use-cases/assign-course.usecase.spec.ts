import { AssignCourseUseCase } from "./assign-course.usecase";

describe(AssignCourseUseCase.name, () => {
  it("assigns published course to multiple employees", async () => {
    const repo = {
      findCourseById: jest.fn().mockResolvedValue({ id: "c1", status: "published" }),
      insertAssignment: jest.fn().mockResolvedValueOnce({ id: "asg-1" }).mockResolvedValueOnce({ id: "asg-2" }),
      insertEnrollment: jest.fn().mockResolvedValue({}),
    };
    const eventOutbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) };
    const useCase = new AssignCourseUseCase(repo as any, eventOutbox as any);
    await useCase.execute({ courseId: "c1", employeeIds: ["emp-1", "emp-2"] }, "admin-1");

    expect(repo.insertAssignment).toHaveBeenCalledTimes(2);
    expect(repo.insertEnrollment).toHaveBeenCalledTimes(2);
    expect(eventOutbox.stage).toHaveBeenCalledTimes(2);
  });

  it("rejects assignment of draft course", async () => {
    const repo = { findCourseById: jest.fn().mockResolvedValue({ id: "c1", status: "draft" }) };
    const useCase = new AssignCourseUseCase(repo as any, {} as any);
    await expect(
      useCase.execute({ courseId: "c1", employeeIds: ["emp-1"] }, "admin-1"),
    ).rejects.toThrow("Only published courses can be assigned");
  });
});
