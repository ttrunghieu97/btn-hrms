import { Inject, Injectable } from "@nestjs/common";
import { IPayrollPeriodReaderPort, PAYROLL_PERIOD_READER_PORT } from "../../../../contracts/ports/payroll-period-reader.port";

@Injectable()
export class PayrollLockRepository {
  constructor(
    @Inject(PAYROLL_PERIOD_READER_PORT)
    private readonly reader: IPayrollPeriodReaderPort,
  ) {}

  findLockedPayrollPeriod(workDate: string) {
    return this.reader.findLockedPeriod(workDate);
  }
}
