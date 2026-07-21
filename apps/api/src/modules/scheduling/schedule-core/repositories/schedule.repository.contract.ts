import { type InferSelectModel } from "drizzle-orm";
import { type dailySchedules, type scheduleRequirements } from "../../../../infrastructure/database/schema";

export type DailyScheduleRecord = InferSelectModel<typeof dailySchedules>;
export type ScheduleRequirementRecord = InferSelectModel<typeof scheduleRequirements>;

export interface RequirementInput {
  locationId?: string;
  workRoleId?: string;
  shiftTemplateId?: string;
  requiredCount: number;
}

export interface IScheduleRepository {
  ensureSchedule(date: string): Promise<DailyScheduleRecord>;
  getSchedule(date: string): Promise<DailyScheduleRecord | null>;
  getScheduleById(id: string): Promise<DailyScheduleRecord | null>;
  updateStatus(id: string, status: string, userId?: string): Promise<DailyScheduleRecord | null>;
  getRequirements(scheduleId: string): Promise<ScheduleRequirementRecord[]>;
  replaceRequirements(scheduleId: string, requirements: RequirementInput[]): Promise<ScheduleRequirementRecord[]>;
}
