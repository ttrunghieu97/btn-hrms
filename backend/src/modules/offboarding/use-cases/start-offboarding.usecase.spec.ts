import { StartOffboardingUseCase } from "./start-offboarding.usecase";

describe(StartOffboardingUseCase.name, () => {
  it("creates offboarding process when no active process exists", async () => {
    const processReader = {
      findActiveByEmployeeId: jest.fn().mockResolvedValue(null),
      findActiveTemplateByType: jest.fn().mockResolvedValue({
        template: { id: "tmpl-1" },
      }),
    };
    const createBoarding = {
      execute: jest.fn().mockResolvedValue({ id: "proc-1", status: "pending", employeeId: "emp-1" }),
    };
    const offboardingRepo = {
      seedClearances: jest.fn().mockResolvedValue([]),
    };
    const outbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) };

    const useCase = new StartOffboardingUseCase(
      processReader as any, createBoarding as any, offboardingRepo as any, outbox as any,
    );
    const result = await useCase.execute("emp-1");

    expect(createBoarding.execute).toHaveBeenCalledWith({
      employeeId: "emp-1", templateId: "tmpl-1", type: "offboarding",
    });
    expect(offboardingRepo.seedClearances).toHaveBeenCalledWith("proc-1");
    expect(outbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "offboarding.started.v1" }),
    );
    expect(result).toEqual({ processId: "proc-1", status: "pending" });
  });

  it("returns null when active offboarding already exists", async () => {
    const processReader = {
      findActiveByEmployeeId: jest.fn().mockResolvedValue({ id: "proc-1" }),
    };
    const useCase = new StartOffboardingUseCase(
      processReader as any, {} as any, {} as any, {} as any,
    );
    const result = await useCase.execute("emp-1");
    expect(result).toBeNull();
  });

  it("returns null when no active offboarding template configured", async () => {
    const processReader = {
      findActiveByEmployeeId: jest.fn().mockResolvedValue(null),
      findActiveTemplateByType: jest.fn().mockResolvedValue(null),
    };
    const useCase = new StartOffboardingUseCase(
      processReader as any, {} as any, {} as any, {} as any,
    );
    const result = await useCase.execute("emp-1");
    expect(result).toBeNull();
  });
});
