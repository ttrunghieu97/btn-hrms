import { Injectable } from "@nestjs/common";
import { OnboardingProcessRepository } from "../../modules/onboarding/repositories/onboarding-process.repository";
import type {
  IBoardingProcessReader,
  ProcessDetail,
  PaginatedProcesses,
  ActiveTemplate,
} from "../ports/boarding-process-reader.port";

@Injectable()
export class BoardingProcessReaderAdapter implements IBoardingProcessReader {
  constructor(
    private readonly repo: OnboardingProcessRepository,
  ) {}

  async findActiveByEmployeeId(
    employeeId: string,
    type: "onboarding" | "offboarding",
  ): Promise<{ id: string; status: string } | null> {
    return this.repo.findActiveByEmployeeId(employeeId, type);
  }

  async findByIdWithItems(id: string): Promise<ProcessDetail | null> {
    const result = await this.repo.findByIdWithItems(id);
    if (!result) return null;
    return {
      ...result,
      checklistItems: result.checklistItems.map((ci) => ({
        ...ci,
        status: ci.status ?? "pending",
      })),
    };
  }

  async findByType(
    type: "onboarding" | "offboarding",
    page = 1,
    limit = 20,
  ): Promise<PaginatedProcesses> {
    return this.repo.findByType(type, page, limit);
  }

  async findActiveTemplateByType(
    type: "onboarding" | "offboarding",
  ): Promise<ActiveTemplate | null> {
    return this.repo.findActiveTemplateByType(type);
  }
}
