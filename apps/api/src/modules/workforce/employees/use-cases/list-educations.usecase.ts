import { Injectable } from "@nestjs/common";
import { EmployeeEducationRepository } from "../repositories/employee-education.repository";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ERROR_REASONS } from "../../../../shared/constants/error-reasons";

@Injectable()
export class ListEducationsUseCase {
  constructor(
    private readonly educationRepo: EmployeeEducationRepository,
  ) {}

  async execute(employeeId: string) {
    if (!employeeId) {
      throwBadRequest("employeeId is required", ERROR_CODES.INVALID_REQUEST, {
        reason: ERROR_REASONS.INVALID_STATE,
      });
    }

    return this.educationRepo.findByEmployeeId(employeeId);
  }
}
