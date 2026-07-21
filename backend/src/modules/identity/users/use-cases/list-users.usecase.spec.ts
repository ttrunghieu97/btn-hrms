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
});
