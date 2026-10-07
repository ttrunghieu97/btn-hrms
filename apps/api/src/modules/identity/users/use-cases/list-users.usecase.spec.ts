import { ListUsersUseCase } from "./list-users.usecase";

import type { UsersRepository } from "../repositories/users.repository";

describe(ListUsersUseCase.name, () => {
  it("calls repository with query", async () => {
    const usersRepo = {
      findPaginated: jest.fn().mockResolvedValue({
        rows: [],
        total: 0,
        page: 1,
        limit: 20,
      }),
    };

    const employeeReader = {
      findEmployeeByUserId: jest.fn().mockResolvedValue(null),
    };

    const useCase = new ListUsersUseCase(
      usersRepo as unknown as UsersRepository,
      employeeReader as any,
    );
    await useCase.execute({ page: 1, limit: 20 });

    expect(usersRepo.findPaginated).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
  });

  it("batches employee lookups in a single query when include=employee", async () => {
    const usersRepo = {
      findPaginated: jest.fn().mockResolvedValue({
        rows: [
          { id: "u1", username: "alice" },
          { id: "u2", username: "bob" },
        ],
        total: 2,
        page: 1,
        limit: 20,
      }),
    };

    const employeeReader = {
      findEmployeesByUserIds: jest.fn().mockResolvedValue([
        { id: "e1", userId: "u1", firstName: "Alice", lastName: "Smith", avatar: "a.jpg" },
        { id: "e2", userId: "u2", firstName: "Bob", lastName: "Jones", avatar: null },
      ]),
    };

    const useCase = new ListUsersUseCase(
      usersRepo as unknown as UsersRepository,
      employeeReader as any,
    );
    const result = await useCase.execute({ page: 1, limit: 20, include: "employee" });

    expect(employeeReader.findEmployeesByUserIds).toHaveBeenCalledWith(["u1", "u2"]);
    expect(result.data[0]?.employeeUsername).toBe("Alice Smith");
    expect(result.data[0]?.avatar).toBe("a.jpg");
    expect(result.data[1]?.employeeUsername).toBe("Bob Jones");
  });
});
