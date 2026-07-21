import { GetEmployeeUseCase } from "./get-employee.usecase";

describe(GetEmployeeUseCase.name, () => {
  it("calls repository with identifier and optional query", async () => {
    const employeesRepo = {
      findByIdentifier: jest.fn().mockResolvedValue({ id: "e1" }),
    };

    const useCase = new GetEmployeeUseCase(employeesRepo as any, {} as any);
    await useCase.execute("alice");

    expect(employeesRepo.findByIdentifier).toHaveBeenCalledWith("alice", undefined);
  });

  it('maps resolved position using name contract', async () => {
    const employeesRepo = {
      findByIdentifier: jest.fn().mockResolvedValue({
        id: 'e1',
        email: 'a@btn.vn',
        firstName: 'A',
        lastName: 'B',
        employeeCode: 'E1',
        user: { id: 'u1', username: 'ab', email: 'a@btn.vn' },
        employmentRecords: [],
        contracts: [],
        orgAssignments: [
          {
            id: 'oa1',
            jobTitle: 'Kế toán trưởng',
            department: { id: 'd1', name: 'Finance' },
            isCurrent: true,
          },
        ],
        siteAssignments: [],
        certifications: [],
        documents: [],
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      }),
    };
    const positionRepo = {
      findActiveByTitle: jest.fn().mockResolvedValue({
        id: 'pos-1',
        name: 'Kế toán trưởng',
        description: 'desc',
        isActive: true,
      }),
    };

    const useCase = new GetEmployeeUseCase(employeesRepo as any, positionRepo as any);
    const result = await useCase.execute('e1');

    expect(positionRepo.findActiveByTitle).toHaveBeenCalledWith('Kế toán trưởng');
    expect(result.position).toEqual({
      id: 'pos-1',
      name: 'Kế toán trưởng',
      description: 'desc',
      isActive: true,
    });
  });

  it("propagates position lookup failures", async () => {
    const employeesRepo = {
      findByIdentifier: jest.fn().mockResolvedValue({
        id: "e1",
        firstName: "A",
        lastName: "B",
        employeeCode: "E1",
        user: { id: "u1", username: "ab", email: null },
        orgAssignments: [{ id: "oa1", jobTitle: "Accountant", isCurrent: true }],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };
    const positionRepo = {
      findActiveByTitle: jest.fn().mockRejectedValue(new Error("position database unavailable")),
    };
    const useCase = new GetEmployeeUseCase(employeesRepo as any, positionRepo as any);

    await expect(useCase.execute("e1")).rejects.toThrow("position database unavailable");
  });
});
