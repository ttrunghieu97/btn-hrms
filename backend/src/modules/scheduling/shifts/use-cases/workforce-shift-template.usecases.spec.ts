import { Test, type TestingModule } from "@nestjs/testing";
import { CreateWorkforceShiftTemplateUseCase } from "../shift-catalog/use-cases/workforce-shift-template.usecases";
import { WorkforceShiftsRepository } from "../schedule-roster/repositories/workforce-shifts.repository";
import { BadRequestException } from "@nestjs/common";

describe("CreateWorkforceShiftTemplateUseCase", () => {
  let useCase: CreateWorkforceShiftTemplateUseCase;
  let repo: WorkforceShiftsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateWorkforceShiftTemplateUseCase,
        {
          provide: WorkforceShiftsRepository,
          useValue: {
            createShiftTemplate: jest
              .fn()
              .mockResolvedValue({ id: "uuid", version: 1 }),
          },
        },
      ],
    }).compile();

    useCase = module.get<CreateWorkforceShiftTemplateUseCase>(
      CreateWorkforceShiftTemplateUseCase,
    );
    repo = module.get<WorkforceShiftsRepository>(WorkforceShiftsRepository);
  });

  it("should create a template when validation passes", async () => {
    const dto = {
      code: "SHIFT-1",
      name: "Day Shift",
      startTime: "08:00",
      endTime: "17:00",
      overnight: false,
    };

    const result = await useCase.execute(dto);
    expect(result).toBeDefined();
    expect(repo.createShiftTemplate).toHaveBeenCalled();
  });

  it("should throw BadRequestException when time validation fails", async () => {
    const dto = {
      code: "SHIFT-1",
      name: "Invalid Shift",
      startTime: "17:00",
      endTime: "08:00",
      overnight: false,
    };

    await expect(useCase.execute(dto as any)).rejects.toThrow(
      BadRequestException,
    );
  });
});
