import { Inject, Injectable } from "@nestjs/common";
import { GetUserByIdUseCase } from "./get-user-by-id.usecase";
import { IPermissionReader } from "../../../../contracts/ports/permission-reader.port";
import { CONTRACTS_TOKENS } from "../../../../contracts/contracts.tokens";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class GetCurrentUserProfileUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly getUserById: GetUserByIdUseCase,
    @Inject(CONTRACTS_TOKENS.PERMISSION_READER_PORT)
    private readonly permissionReader: IPermissionReader,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetCurrentUserProfileUseCase.name);
  }

  async execute(userId: string) {
    const user = await this.getUserById.execute(userId, {
      page: 1,
      limit: 20,
      include: "employee,userRoles",
    });
    const permissions = await this.permissionReader.getPermissions(userId);
    return { ...user, permissions };
  }
}
