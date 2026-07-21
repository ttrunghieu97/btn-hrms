import { Inject, Injectable } from "@nestjs/common";
import { UsersRepository } from "../repositories/users.repository";
import { UserQueryRequestDto } from "../dto/user-query.dto";
import { UserMapper } from "../mappers/user.mapper";
import { buildPaginatedResponse } from "../../../../shared/utils/pagination.util";
import { EMPLOYEE_READER_PORT, type IEmployeeReader } from "../../../../contracts/ports/employee-reader.port";

@Injectable()
export class ListUsersUseCase {
  constructor(
    private readonly usersRepo: UsersRepository,
    @Inject(EMPLOYEE_READER_PORT)
    private readonly employeeReader: IEmployeeReader,
  ) {}

  async execute(query: UserQueryRequestDto) {
    const { rows, total, page, limit } = await this.usersRepo.findPaginated(query);

    const includesEmployee = query.include?.split(",").map(s => s.trim()).includes("employee");
    if (includesEmployee && rows.length > 0) {
      await Promise.all(
        rows.map(async (user) => {
          const employee = await this.employeeReader.findEmployeeByUserId(user.id);
          user.employee = employee ? {
            id: employee.id!,
            firstName: employee.firstName!,
            lastName: employee.lastName!,
            avatar: employee.avatar ?? null,
          } : null;
        })
      );
    }

    return buildPaginatedResponse(
      UserMapper.toResponseDtos(rows),
      total,
      page,
      limit,
    );
  }
}
