import { Injectable } from "@nestjs/common";
import { UsersRepository } from "../repositories/users.repository";
import { UserMapper } from "../mappers/user.mapper";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class GetUserByEmailUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetUserByEmailUseCase.name);
  }

  async execute(email: string) {
    const user = await this.usersRepo.findByEmail(email);
    return UserMapper.toResponseDto(user);
  }
}
