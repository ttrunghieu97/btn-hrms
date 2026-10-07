import { Injectable } from "@nestjs/common";
import { AuthRepository } from "../../auth/repositories/auth.repository";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class RevokeUserSessionsUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, RevokeUserSessionsUseCase.name);
  }

  async execute(userId: string) {
    const revoked = await this.authRepo.revokeAllRefreshTokens(userId);
    return { ok: true, revoked };
  }
}
