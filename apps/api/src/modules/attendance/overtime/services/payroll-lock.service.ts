import { formatDateISO } from "@/shared/utils/date-format";
import { Injectable } from "@nestjs/common";
import { PayrollLockRepository } from "../repositories/payroll-lock.repository";
import { throwBadRequest } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";

@Injectable()
export class PayrollLockService {
  constructor(private readonly payrollLockRepo: PayrollLockRepository) {}

  async isDateLocked(workDate: string | Date): Promise<boolean> {
    const dateStr =
      typeof workDate === "string"
        ? workDate
        : formatDateISO(workDate)!;

    const lockedPeriod = await this.payrollLockRepo.findLockedPayrollPeriod(dateStr);

    if (!lockedPeriod) return false;

    const lockingStatuses = ["processing", "closed", "paid"];
    return lockingStatuses.includes(lockedPeriod.status);
  }

  async ensureDateNotLocked(workDate: string | Date) {
    const locked = await this.isDateLocked(workDate);
    if (locked) {
      throwBadRequest(
        "Attendance data for this date is locked due to payroll processing",
        ERROR_CODES.INVALID_REQUEST,
      );
    }
  }
}



