import { DomainEvent } from "../domain-event.base";

export class PayrollGeneratedEvent extends DomainEvent<{
  employeeId: string;
  payrollId: string;
}> {
  constructor(public readonly employeeId: string, public readonly payrollId: string) {
    super("PayrollGeneratedEvent", "payroll", { employeeId, payrollId });
  }
}
