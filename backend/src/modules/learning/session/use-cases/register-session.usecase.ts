import { Injectable } from "@nestjs/common";
import { SessionRepository } from "../repositories/session.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
@Injectable()
export class RegisterSessionUseCase {
  constructor(private readonly repo: SessionRepository) {}
  async execute(sessionId: string, employeeId: string): Promise<void> {
    const session = await this.repo.findById(sessionId);
    if (!session) throwNotFound("Session not found", ERROR_CODES.NOT_FOUND);
    if (session.status !== "published") throwBadRequest("Session must be published", ERROR_CODES.INVALID_REQUEST);
    await this.repo.insertAttendee({ sessionId, employeeId, status: "registered" });
  }
}