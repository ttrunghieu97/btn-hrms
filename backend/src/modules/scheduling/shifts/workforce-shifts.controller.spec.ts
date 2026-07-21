import { Test } from "@nestjs/testing";
import { WorkforceShiftsController } from "./workforce-shifts.controller";
import {
  ArchiveWorkforceShiftTemplateUseCase,
  CreateWorkforceShiftTemplateUseCase,
  ListWorkforceShiftTemplatesUseCase,
  UpdateWorkforceShiftTemplateUseCase,
} from "./shift-catalog/use-cases/workforce-shift-template.usecases";
import {
  CancelEmployeeShiftAssignmentUseCase,
  CreateEmployeeShiftAssignmentUseCase,
  ListEmployeeShiftAssignmentsUseCase,
  UpdateEmployeeShiftAssignmentUseCase,
} from "./schedule-roster/use-cases/assignments/employee-shift-assignment.usecases";
import {
  ApproveShiftRosterUseCase,
  PublishShiftRosterUseCase,
  QueryShiftRosterUseCase,
  RejectShiftRosterUseCase,
  SubmitShiftRosterForApprovalUseCase,
} from "./schedule-roster/use-cases/roster/shift-roster.usecases";
import { QueryScopeService } from "../../../core/security/query-scope.service";

describe("WorkforceShiftsController", () => {
  it("delegates roster query to use case", async () => {
    const queryRoster = { execute: jest.fn().mockResolvedValue({ rows: [] }) };

    const moduleRef = await Test.createTestingModule({
      controllers: [WorkforceShiftsController],
      providers: [
        {
          provide: ListWorkforceShiftTemplatesUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: QueryScopeService,
          useValue: { resolveScope: jest.fn().mockReturnValue(undefined) },
        },
        {
          provide: CreateWorkforceShiftTemplateUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdateWorkforceShiftTemplateUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ArchiveWorkforceShiftTemplateUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ListEmployeeShiftAssignmentsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: CreateEmployeeShiftAssignmentUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdateEmployeeShiftAssignmentUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: CancelEmployeeShiftAssignmentUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: QueryShiftRosterUseCase, useValue: queryRoster },
        {
          provide: SubmitShiftRosterForApprovalUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ApproveShiftRosterUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: RejectShiftRosterUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: PublishShiftRosterUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    const controller = moduleRef.get(WorkforceShiftsController);
    const payload = {
      from: "2026-04-14",
      to: "2026-04-20",
    };

    const req = { user: { permissions: [] } } as any;

    await controller.queryRosterApi(payload, req);

    expect(queryRoster.execute).toHaveBeenCalledWith(payload, undefined);
  });
});
