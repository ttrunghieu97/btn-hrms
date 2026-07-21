import { ResetEmployeePasswordUseCase } from "./use-cases/reset-employee-password.usecase";
jest.mock("uuid", () => ({ v5: jest.fn() }));
import { Test, type TestingModule } from "@nestjs/testing";
import { EmployeesController } from "./employees.controller";
import { ListEmployeesUseCase } from "./use-cases/list-employees.usecase";
import { QueryScopeService } from "../../../core/security/query-scope.service";
import { EmployeeQueryDto } from "./dto/employee-query.dto";
import { GetEmployeeByUserUseCase } from "./use-cases/get-employee-by-user.usecase";
import { GetEmployeeUseCase } from "./use-cases/get-employee.usecase";
import { CheckUsernameUseCase } from "./use-cases/check-username.usecase";
import { CreateEmployeeUseCase } from "./use-cases/create-employee.usecase";
import { UpdateEmployeeUseCase } from "./use-cases/update-employee.usecase";
import { DeleteEmployeeUseCase } from "./use-cases/delete-employee.usecase";
import { RestoreEmployeeUseCase } from "./use-cases/restore-employee.usecase";
import { PurgeEmployeeUseCase } from "./use-cases/purge-employee.usecase";
import { CheckEmployeeCodeUseCase } from "./use-cases/check-employee-code.usecase";
import { EmployeeDataPipe } from "./employee-data.pipe";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { IdempotencyService } from "../../../infrastructure/idempotency/idempotency.service";
import { INTERCEPTORS_METADATA } from "@nestjs/common/constants";
import { CHECK_POLICY_KEY } from "../../../core/security/decorators/check-policy.decorator";
import { EmployeePolicies } from "../../../core/security/policies/employee.policy";

describe("EmployeesController Scoping", () => {
  let controller: EmployeesController;
  let listEmployeesUseCase: ListEmployeesUseCase;
  let queryScopeService: QueryScopeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [
        {
          provide: ListEmployeesUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: QueryScopeService,
          useValue: { resolveScope: jest.fn() },
        },
        { provide: GetEmployeeByUserUseCase, useValue: { execute: jest.fn() } },
        { provide: GetEmployeeUseCase, useValue: { execute: jest.fn() } },
        { provide: CheckUsernameUseCase, useValue: { execute: jest.fn() } },
        { provide: CheckEmployeeCodeUseCase, useValue: { execute: jest.fn() } },
        { provide: CreateEmployeeUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateEmployeeUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteEmployeeUseCase, useValue: { execute: jest.fn() } },
        { provide: RestoreEmployeeUseCase, useValue: { execute: jest.fn() } },
        { provide: PurgeEmployeeUseCase, useValue: { execute: jest.fn() } },
        { provide: ResetEmployeePasswordUseCase, useValue: {} },
        { provide: EmployeeDataPipe, useValue: { transform: jest.fn() } },
        { provide: IdempotencyService, useValue: { handle: jest.fn() } },
        {
          provide: RequestContextService,
          useValue: { get: jest.fn(() => ({ requestId: "test", startTime: 0 })) },
        },
      ],
    }).compile();

    controller = module.get<EmployeesController>(EmployeesController);
    listEmployeesUseCase =
      module.get<ListEmployeesUseCase>(ListEmployeesUseCase);
    queryScopeService = module.get<QueryScopeService>(QueryScopeService);
  });

  it("should resolve data scope and pass it to use case", async () => {
    const mockUser = {
      id: "user-1",
      permissions: ["employees:view:department"],
      departmentId: "dept-1",
    } as any;
    const mockScope = { tier: "department" as const, departmentId: "dept-1" };
    const query = new EmployeeQueryDto();

    (queryScopeService.resolveScope as jest.Mock).mockReturnValue(mockScope);

    await controller.findAll(query, { user: mockUser });

    expect(queryScopeService.resolveScope).toHaveBeenCalledWith(
      mockUser,
      "employees",
    );
    expect(listEmployeesUseCase.execute).toHaveBeenCalledWith(query, mockScope, false);
  });

  it("protects getMyProfile with the self-view employee policy", () => {
    const metadata = Reflect.getMetadata(
      CHECK_POLICY_KEY,
      EmployeesController.prototype.getMyProfile,
    );

    expect(metadata).toEqual([EmployeePolicies.viewSelf]);
  });

  it.each([
    ["create", EmployeesController.prototype.create],
    ["update", EmployeesController.prototype.update],
  ])("parses multipart employee %s requests before body validation", (_name, handler) => {
    const metadata = Reflect.getMetadata(INTERCEPTORS_METADATA, handler);

    expect(metadata).toEqual(expect.arrayContaining([expect.any(Function)]));
  });
});
