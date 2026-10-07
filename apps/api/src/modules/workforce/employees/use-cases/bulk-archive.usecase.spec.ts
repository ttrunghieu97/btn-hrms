import { BulkArchiveUseCase } from "./bulk-archive.usecase";
import { type BulkArchiveDto } from "../dto/bulk-archive.dto";

describe("BulkArchiveUseCase", () => {
  it("archives each employee independently", async () => {
    const deleteEmployee = { execute: jest.fn().mockResolvedValue(undefined) };
    const useCase = new BulkArchiveUseCase(deleteEmployee as any);

    const dto: BulkArchiveDto = { employeeIds: ["e1", "e2"] };
    const result = await useCase.execute(dto);

    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(2);
    expect(deleteEmployee.execute).toHaveBeenCalledTimes(2);
  });

  it("continues on failure", async () => {
    const deleteEmployee = {
      execute: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Not terminal")),
    };
    const useCase = new BulkArchiveUseCase(deleteEmployee as any);

    const result = await useCase.execute({ employeeIds: ["e1", "e2"] });
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
  });
});
