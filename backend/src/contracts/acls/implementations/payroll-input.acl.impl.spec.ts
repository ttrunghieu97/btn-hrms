import { PayrollInputAclImpl } from "./payroll-input.acl.impl";

describe("PayrollInputAclImpl", () => {
  const acl = new PayrollInputAclImpl();

  it("maps attendance signals to payroll input rows", () => {
    const rows = acl.mapTimeSignalsToPayrollInputs({
      workedHours: 40,
      overtimeHours: 3,
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      type: "attendance_hours",
      quantity: "40",
    });
    expect(rows[1]).toMatchObject({
      type: "overtime_hours",
      quantity: "3",
    });
  });
});
