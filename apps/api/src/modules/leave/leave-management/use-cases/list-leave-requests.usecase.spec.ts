import { Test } from "@nestjs/testing";
import { ListLeaveRequestsUseCase } from "./list-leave-requests.usecase";
import { LeaveRequestsRepository } from "../repositories/leave-requests.repository";
import { RequestContextService } from "../../../../shared/context/request-context.service";

describe(ListLeaveRequestsUseCase.name, () => {
  it("returns paginated leave requests", async () => {
    const repo = {
      list: jest.fn().mockResolvedValue({
        rows: [{ id: "req-1", status: "pending" }],
        total: 1, page: 1, limit: 20,
      }),
    } as any;
    const module = await Test.createTestingModule({
      providers: [
        ListLeaveRequestsUseCase,
        { provide: LeaveRequestsRepository, useValue: repo },
        { provide: RequestContextService, useValue: { getRequestId: jest.fn(), get: jest.fn() } },
      ],
    }).compile();
    const useCase = module.get(ListLeaveRequestsUseCase);
    const result = await useCase.execute({} as any);
    expect(result.rows).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
