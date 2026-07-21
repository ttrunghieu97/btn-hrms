import { Test } from "@nestjs/testing";
import { GetLeaveRequestUseCase } from "./get-leave-request.usecase";
import { LeaveRequestsRepository } from "../repositories/leave-requests.repository";
import { RequestContextService } from "../../../../shared/context/request-context.service";

describe(GetLeaveRequestUseCase.name, () => {
  it("returns leave request when found", async () => {
    const repo = { findById: jest.fn().mockResolvedValue({ id: "req-1", status: "approved" }) } as any;
    const module = await Test.createTestingModule({
      providers: [
        GetLeaveRequestUseCase,
        { provide: LeaveRequestsRepository, useValue: repo },
        { provide: RequestContextService, useValue: { getRequestId: jest.fn(), get: jest.fn() } },
      ],
    }).compile();
    const useCase = module.get(GetLeaveRequestUseCase);
    const result = await useCase.execute("req-1");
    expect(result).toBeDefined();
  });

  it("throws when not found", async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null) } as any;
    const module = await Test.createTestingModule({
      providers: [
        GetLeaveRequestUseCase,
        { provide: LeaveRequestsRepository, useValue: repo },
        { provide: RequestContextService, useValue: { getRequestId: jest.fn(), get: jest.fn() } },
      ],
    }).compile();
    const useCase = module.get(GetLeaveRequestUseCase);
    await expect(useCase.execute("missing")).rejects.toThrow("Leave request not found");
  });
});
