import { Test } from "@nestjs/testing";
import { ListEmployeeLeaveBalancesUseCase } from "./list-employee-leave-balances.usecase";
import { LeaveRequestsRepository } from "../repositories/leave-requests.repository";
import { RequestContextService } from "../../../../shared/context/request-context.service";

describe(ListEmployeeLeaveBalancesUseCase.name, () => {
  it("returns balances for employee", async () => {
    const repo = {
      listBalancesByEmployee: jest.fn().mockResolvedValue([
        { leaveTypeId: "type-1", totalUnits: "12", usedUnits: "3", remainingUnits: "9", leaveType: { id: "type-1", code: "AL", name: "Annual", unit: "day" } },
      ]),
    } as any;
    const module = await Test.createTestingModule({
      providers: [
        ListEmployeeLeaveBalancesUseCase,
        { provide: LeaveRequestsRepository, useValue: repo },
        { provide: RequestContextService, useValue: { getRequestId: jest.fn(), get: jest.fn() } },
      ],
    }).compile();
    const useCase = module.get(ListEmployeeLeaveBalancesUseCase);
    const result = await useCase.execute("emp-1");
    expect(result).toHaveLength(1);
  });
});
