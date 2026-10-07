import { canAccessRoute, canPerformAction, canAccessResource } from "../authorization/authorization.evaluator";

describe("Backend Authorization Evaluator (PR-4)", () => {
  it("evaluates route access correctly on backend", () => {
    expect(canAccessRoute("/employees", ["employee:view"])).toBe(true);
    expect(canAccessRoute("/employees", ["leave:view"])).toBe(false);
  });

  it("evaluates resource access correctly on backend", () => {
    expect(canAccessResource("employee.compensation", ["employee:manage:sensitive"])).toBe(true);
    expect(canAccessResource("employee.compensation", ["employee:view"])).toBe(false);
  });

  it("evaluates action access correctly on backend", () => {
    expect(canPerformAction("employee.delete", ["employee:delete"])).toBe(true);
    expect(canPerformAction("employee.delete", ["employee:view"])).toBe(false);
  });
});
