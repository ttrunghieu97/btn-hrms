import { Injectable } from "@nestjs/common";
import { EmployeesRepository } from "../repositories/employees.repository";
import { normalizeUsername } from "../employees.helpers";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

@Injectable()
export class CheckUsernameUseCase {
  private readonly logger: ContextLogger;
  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, CheckUsernameUseCase.name);
  }

  async execute(rawUsername: string) {
    const username = normalizeUsername(rawUsername);
    if (!username) {
      throwBadRequest("Username is required", ERROR_CODES.INVALID_REQUEST, {
        reason: ERROR_REASONS.INVALID_STATE,
      });
    }
    const exists = await this.employeesRepo.userExistsByUsername(username);
    return { exists };
  }
}

