import { type InferSelectModel } from "drizzle-orm";
import { type scheduleRequests, type employees } from "../../../../infrastructure/database/schema";

export type ScheduleRequestRecord = InferSelectModel<typeof scheduleRequests>;
export type RequestStatus = "PENDING" | "APPROVED" | "DENIED";
export type RequestType = "MORNING_OFF" | "AFTERNOON_OFF" | "FULL_DAY_OFF";

export interface ScheduleRequestWithEmployee extends ScheduleRequestRecord {
  employee?: Pick<InferSelectModel<typeof employees>, "id" | "firstName" | "lastName" | "employeeCode"> | null;
}

export interface IScheduleRequestsRepository {
  findById(id: string): Promise<ScheduleRequestRecord | null>;
  findByEmployeeId(employeeId: string): Promise<ScheduleRequestWithEmployee[]>;
  findAll(filters?: { status?: string; employeeId?: string }): Promise<ScheduleRequestWithEmployee[]>;
  create(values: {
    employeeId: string;
    date: string;
    requestType: RequestType;
    reason?: string;
  }): Promise<ScheduleRequestRecord>;
  updateStatus(
    id: string,
    status: RequestStatus,
    reviewedBy: string
  ): Promise<ScheduleRequestRecord | null>;
}
