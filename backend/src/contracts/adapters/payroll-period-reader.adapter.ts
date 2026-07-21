import { Inject, Injectable } from "@nestjs/common";
import { and, gte, inArray, lte } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../infrastructure/database/database.provider";
import { AppDatabase } from "../../infrastructure/database/database-client.type";
import * as schema from "../../infrastructure/database/schema";
import { IPayrollPeriodReaderPort, PayrollPeriodInfo } from "../ports/payroll-period-reader.port";

@Injectable()
export class PayrollPeriodReaderAdapter implements IPayrollPeriodReaderPort {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {}

  async findLockedPeriod(date: string): Promise<PayrollPeriodInfo | null> {
    const row = await this.db.query.payrollPeriods.findFirst({
      where: and(
        lte(schema.payrollPeriods.startsOn, date),
        gte(schema.payrollPeriods.endsOn, date),
        inArray(schema.payrollPeriods.status, [
          "processing" as const,
          "closed" as const,
          "paid" as const,
        ]),
      ),
      columns: {
        id: true,
        status: true,
        startsOn: true,
        endsOn: true,
      },
    });
    return row ?? null;
  }
}
