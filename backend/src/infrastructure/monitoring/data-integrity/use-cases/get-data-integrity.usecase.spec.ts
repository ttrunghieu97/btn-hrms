import { RequestContextService } from "../../../../shared/context/request-context.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import type { DataIntegrityRepository } from "../repositories/data-integrity.repository";
import { GetDataIntegrityUseCase } from "./get-data-integrity.usecase";

describe(GetDataIntegrityUseCase.name, () => {
  it("continues remaining checks when one integrity query fails", async () => {
    const repository = {
      countEmployeesWithoutDepartment: jest
        .fn()
        .mockRejectedValue(new Error("database unavailable")),
      countEmployeesWithoutUser: jest.fn().mockResolvedValue(2),
      countOrphanAttendances: jest.fn().mockResolvedValue(0),
      countStalledTasks: jest.fn().mockResolvedValue(0),
      countStaleLeaveRequests: jest.fn().mockResolvedValue(0),
      countDuplicateEmployeeCodes: jest.fn().mockResolvedValue(0),
    } as unknown as DataIntegrityRepository;
    const logError = jest
      .spyOn(ContextLogger.prototype, "error")
      .mockImplementation();
    const useCase = new GetDataIntegrityUseCase(
      repository,
      new RequestContextService(),
    );

    const result = await useCase.execute();

    expect(result.issues).toEqual([
      expect.objectContaining({
        check: "employees_without_user",
        count: 2,
      }),
    ]);
    expect(result.totalIssues).toBe(1);
    expect(result.criticalCount).toBe(1);
    expect(logError).toHaveBeenCalledWith(
      "checkEmployeesWithoutDepartment",
      expect.objectContaining({ msg: "database unavailable" }),
    );
  });
});
