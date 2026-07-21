import { Injectable } from "@nestjs/common";
import { PayrollInputAcl } from "../payroll-input.acl";

@Injectable()
export class PayrollInputAclImpl implements PayrollInputAcl {
  mapTimeSignalsToPayrollInputs(input: Record<string, unknown>): {
    type: string;
    amount?: string;
    quantity?: string;
    metadata?: Record<string, unknown>;
  }[] {
    const workedHours = Number(input.workedHours ?? 0);
    const overtimeHours = Number(input.overtimeHours ?? 0);

    return [
      {
        type: "attendance_hours",
        quantity: Number.isFinite(workedHours) ? String(workedHours) : "0",
        metadata: { source: "attendance" },
      },
      {
        type: "overtime_hours",
        quantity: Number.isFinite(overtimeHours) ? String(overtimeHours) : "0",
        metadata: { source: "attendance" },
      },
    ];
  }
}
