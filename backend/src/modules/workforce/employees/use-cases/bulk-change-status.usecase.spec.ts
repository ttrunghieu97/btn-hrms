import { BulkChangeStatusUseCase } from "./bulk-change-status.usecase";
import { type BulkStatusDto } from "../dto/bulk-status.dto";

describe("BulkChangeStatusUseCase", () => {
  it("processes each employee independently", async () => {
    const lifecycle = {
      changeStatus: jest.fn().mockResolvedValue({ success: true }),
    };
    const useCase = new BulkChangeStatusUseCase(lifecycle as any);

    const dto: BulkStatusDto = { employeeIds: ["e1", "e2"], status: "leave", reason: "Bulk" };
    const result = await useCase.execute(dto);

    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
    expect(lifecycle.changeStatus).toHaveBeenCalledTimes(2);
  });

  it("returns partial failure when one employee fails", async () => {
    const lifecycle = {
      changeStatus: jest
        .fn()
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error("Cannot change status")),
    };
    const useCase = new BulkChangeStatusUseCase(lifecycle as any);

    const dto: BulkStatusDto = { employeeIds: ["e1", "e2"], status: "leave" };
    const result = await useCase.execute(dto);

    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.results[0]!.success).toBe(true);
    expect(result.results[1]!.success).toBe(false);
    expect(result.results[1]!.error).toBe("Cannot change status");
  });

  it("handles empty list", async () => {
    const lifecycle = { changeStatus: jest.fn() };
    const useCase = new BulkChangeStatusUseCase(lifecycle as any);

    const result = await useCase.execute({ employeeIds: [], status: "leave" });
    expect(result.total).toBe(0);
    expect(result.succeeded).toBe(0);
  });
});
