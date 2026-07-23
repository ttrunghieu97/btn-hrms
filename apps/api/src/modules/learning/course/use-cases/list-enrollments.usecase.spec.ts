import { ListEnrollmentsUseCase } from "./list-enrollments.usecase";

describe(ListEnrollmentsUseCase.name, () => {
  it("returns enrollments for a given employee", async () => {
    const repo = {
      findEnrollmentsByEmployee: jest.fn().mockResolvedValue([
        { id: "enr-1", courseId: "c1", employeeId: "emp-1", status: "enrolled", progressPercent: 30 },
        { id: "enr-2", courseId: "c2", employeeId: "emp-1", status: "completed", progressPercent: 100 },
      ]),
    };
    const useCase = new ListEnrollmentsUseCase(repo as any);
    const result = await useCase.execute("emp-1");

    expect(result).toHaveLength(2);
    expect(result[0]!.status).toBe("enrolled");
    expect(result[1]!.progressPercent).toBe(100);
  });

  it("returns empty list for employee with no enrollments", async () => {
    const repo = { findEnrollmentsByEmployee: jest.fn().mockResolvedValue([]) };
    const useCase = new ListEnrollmentsUseCase(repo as any);
    const result = await useCase.execute("emp-1");
    expect(result).toEqual([]);
  });
});
