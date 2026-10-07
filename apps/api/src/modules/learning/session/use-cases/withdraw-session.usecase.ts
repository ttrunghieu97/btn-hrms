import { Injectable } from "@nestjs/common";
import { SessionRepository } from "../repositories/session.repository";
import { throwBadRequest, throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
@Injectable()
export class WithdrawSessionUseCase {
  constructor(private readonly repo: SessionRepository) {}
  async execute(sessionId: string, employeeId: string): Promise<void> {
    const attendee = await this.repo.findAttendee(sessionId, employeeId);
    if (!attendee) throwNotFound("Not registered", ERROR_CODES.NOT_FOUND);
    if (attendee.status !== "registered") throwBadRequest("Can only withdraw registered attendees", ERROR_CODES.INVALID_REQUEST);
    await this.repo.updateAttendee(attendee.id, { status: "withdrawn" });
  }
}