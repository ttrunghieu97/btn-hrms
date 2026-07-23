import { ShiftRosterLockService } from "../schedule-roster/services/shift-roster-lock.service";
import { Test, type TestingModule } from "@nestjs/testing";
import { CreateEmployeeShiftAssignmentUseCase } from "../schedule-roster/use-cases/assignments/employee-shift-assignment.usecases";
import { WorkforceShiftsRepository } from "../schedule-roster/repositories/workforce-shifts.repository";
import { ShiftValidationService } from "../schedule-roster/services/shift-validation.service";
import { ConflictException } from "@nestjs/common";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";

describe("CreateEmployeeShiftAssignmentUseCase", () => {
  let useCase: CreateEmployeeShiftAssignmentUseCase;
  let repo: WorkforceShiftsRepository;
  let validationService: ShiftValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateEmployeeShiftAssignmentUseCase,
        {
          provide: ShiftValidationService,
          useValue: {
            validateAssignment: jest.fn().mockResolvedValue([
              { success: true, ruleName: "NoOverlappingShifts" },
              { success: true, ruleName: "MinimumRestPeriod" },
              { success: true, ruleName: "MaxWeeklyHours" },
              { success: true, ruleName: "MaxConsecutiveDays" }
            ])
          }
        },
        { provide: ShiftRosterLockService, useValue: { ensurePeriodEditable: jest.fn().mockResolvedValue(undefined) } },
        { provide: EventOutboxService, useValue: { stage: jest.fn().mockResolvedValue(undefined) } },
        {
          provide: WorkforceShiftsRepository,
          useValue: {
            findShiftTemplateById: jest.fn().mockResolvedValue({
              id: "tmpl-uuid",
              status: "published",
              isActive: true,
            }),
            findLocationById: jest.fn().mockResolvedValue({ id: "loc-uuid", name: "Zone A" }),
            listEmployeeAssignmentsForConflict: jest.fn().mockResolvedValue([]),
            createShiftAssignment: jest
              .fn()
              .mockResolvedValue({ id: "asgn-uuid" }),
            findShiftAssignmentById: jest
              .fn()
              .mockResolvedValue({ id: "asgn-uuid" }),
          },
        },
      ],
    }).compile();

    useCase = module.get<CreateEmployeeShiftAssignmentUseCase>(
      CreateEmployeeShiftAssignmentUseCase,
    );
    repo = module.get<WorkforceShiftsRepository>(WorkforceShiftsRepository);
    validationService = module.get<ShiftValidationService>(ShiftValidationService);
  });

  it("should create assignment when no conflicts exist", async () => {
    const dto = {
      employeeId: "emp-uuid",
      shiftTemplateId: "tmpl-uuid",
      positionId: "pos-uuid",
      effectiveFrom: "2026-05-01",
    };

    const result = await useCase.execute(dto);
    expect(result).toBeDefined();
    expect(repo.createShiftAssignment).toHaveBeenCalled();
  });

  it("should throw ConflictException when overlap is detected", async () => {
    jest.spyOn(validationService, "validateAssignment").mockResolvedValue([
      { success: false, ruleName: "NoOverlappingShifts", message: "Overlap" }
    ]);

    const dto = {
      employeeId: "emp-uuid",
      shiftTemplateId: "tmpl-uuid",
      positionId: "pos-uuid",
      effectiveFrom: "2026-05-01",
    };

    await expect(useCase.execute(dto as any)).rejects.toThrow(
      ConflictException,
    );
  });
});
