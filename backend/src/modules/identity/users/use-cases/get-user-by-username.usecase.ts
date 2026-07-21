import { Inject, Injectable } from "@nestjs/common";
import { UsersRepository } from "../repositories/users.repository";
import { UserQueryRequestDto } from "../dto/user-query.dto";
import { UserMapper } from "../mappers/user.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { EMPLOYEE_READER_PORT, type IEmployeeReader } from "../../../../contracts/ports/employee-reader.port";

@Injectable()
export class GetUserByUsernameUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly requestContext: RequestContextService,
    @Inject(EMPLOYEE_READER_PORT)
    private readonly employeeReader: IEmployeeReader,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetUserByUsernameUseCase.name);
  }

  async execute(username: string, query?: UserQueryRequestDto) {
    const user = await this.usersRepo.findByUsername(username, query);
    if (!user) return null;

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
