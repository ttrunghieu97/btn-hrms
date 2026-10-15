import { Reflector } from "@nestjs/core";
import { CHECK_POLICY_KEY } from "../../../../core/security/decorators/check-policy.decorator";
import { RESOURCE_KEY } from "../../../../core/security/decorators/resource.decorator";
import { EmployeeAdminController } from "../employee-admin.controller";
import { EmployeeEducationController } from "../employee-education.controller";
import { EmployeeContractsController } from "../../employee-contracts/employee-contracts.controller";
import { EmployeeDocumentsController } from "../../employee-documents/employee-documents.controller";
import { EmployeeAllowancesController } from "../../employee-allowances/employee-allowances.controller";
import { EmployeeSocialInsuranceController } from "../../employee-social-insurance/employee-social-insurance.controller";
import { EmployeeTimelineController } from "../../employee-timeline/employee-timeline.controller";

describe("Controller Decorator Audit", () => {
  const reflector = new Reflector();

  it("employee-admin.controller.ts has @CheckPolicy on all mutation endpoints", () => {
    const methods = [
      "terminate",
      "scheduleTermination",
      "rehireEmployee",
      "requestEmployeeTransfer",
      "resetPassword",
      "purge",
      "bulkStatus",
      "bulkArchiveOp",
    ] as const;

    for (const method of methods) {
      const handler = EmployeeAdminController.prototype[method];
      const policies = reflector.getAllAndOverride(CHECK_POLICY_KEY, [
        handler,
        EmployeeAdminController,
      ]);
      expect(policies).toBeDefined();
      expect(Array.isArray(policies) && policies.length).toBeGreaterThan(0);
    }
  });

  it("all nested employee sub-resource controllers enforce @CheckPolicy and @Resource(Employee, 'employeeId')", () => {
    const nestedControllerRoutes = [
      [EmployeeContractsController, ["get", "history", "update"]],
      [EmployeeTimelineController, ["findAll"]],
      [EmployeeDocumentsController, ["list", "create", "remove"]],
      [EmployeeEducationController, ["findAll", "create", "update", "remove"]],
      [EmployeeAllowancesController, ["findAll", "create", "update", "remove"]],
      [
        EmployeeSocialInsuranceController,
        ["findAll", "create", "update", "remove"],
      ],
    ] as const;

    for (const [ControllerCls, methods] of nestedControllerRoutes) {
      for (const method of methods) {
        const handler = (ControllerCls.prototype as Record<string, any>)[method];
        expect(handler).toBeDefined();

        const policies = reflector.getAllAndOverride(CHECK_POLICY_KEY, [
          handler,
          ControllerCls,
        ]);
        expect(policies).toBeDefined();
        expect(Array.isArray(policies) && policies.length).toBeGreaterThan(0);

        const resourceMeta = reflector.getAllAndOverride(RESOURCE_KEY, [
          handler,
          ControllerCls,
        ]);
        expect(resourceMeta).toEqual({
          entityName: "Employee",
          param: "employeeId",
        });
      }
    }
  });
});
