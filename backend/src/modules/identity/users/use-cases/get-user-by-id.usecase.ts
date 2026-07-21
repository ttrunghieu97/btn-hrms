import { Inject, Injectable } from "@nestjs/common";
import { UsersRepository } from "../repositories/users.repository";
import { UserQueryRequestDto } from "../dto/user-query.dto";
import { UserMapper } from "../mappers/user.mapper";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EMPLOYEE_READER_PORT, type IEmployeeReader } from "../../../../contracts/ports/employee-reader.port";

@Injectable()
export class GetUserByIdUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly requestContext: RequestContextService,
    @Inject(EMPLOYEE_READER_PORT)
    private readonly employeeReader: IEmployeeReader,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetUserByIdUseCase.name);
  }

  async execute(id: string, query?: UserQueryRequestDto) {
    const user = await this.usersRepo.findById(id, query);

    if (!user) {
      throwNotFound(`User with ID ${id} not found`, ERROR_CODES.USER_NOT_FOUND, { userId: id });
    }

    const includesEmployee = query?.include?.split(",").map(s => s.trim()).includes("employee");
    if (includesEmployee) {
      const employee = await this.employeeReader.findEmployeeByUserId(user.id);
      user.employee = employee ? {
        id: employee.id!,
        firstName: employee.firstName!,
        lastName: employee.lastName!,
        avatar: employee.avatar ?? null,
      } : null;
    }

    return UserMapper.toResponseDto(user);
  }
}
