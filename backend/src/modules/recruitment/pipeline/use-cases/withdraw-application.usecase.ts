import { Injectable } from "@nestjs/common";
import { RejectApplicationDto } from "../dto/reject-application.dto";
import { CloseApplicationUseCase } from "./close-application.usecase";

@Injectable()
export class WithdrawApplicationUseCase {
  constructor(private readonly closeApplication: CloseApplicationUseCase) {}

  execute(id: string, dto: RejectApplicationDto) {
    return this.closeApplication.execute(id, "withdrawn", dto.note);
  }
}
