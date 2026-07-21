import { InjectionToken } from "@nestjs/common";

export const BOARDING_PROCESS_READER_PORT = Symbol("BOARDING_PROCESS_READER_PORT");

export interface ProcessDetail {
  id: string;
  employeeId: string;
  templateId: string | null;
  type: string;
  status: string;
  startDate: string;
  targetEndDate: string | null;
  completedAt: Date | null;
  assignedHrUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  checklistItems: {
    id: string;
    title: string;
    dueDaysOffset: number;
    mandatory: boolean;
    status: string;
    dueDate: string | null;
    isCompleted: boolean;
    completedAt: Date | null;
    completedByUserID: string | null;
  }[];
}

export interface ProcessListItem {
  id: string;
  employeeId: string;
  status: string;
  startDate: string;
  completedAt: Date | null;
  createdAt: Date;
}

export interface PaginatedProcesses {
  rows: ProcessListItem[];
  total: number;
}

export interface ActiveTemplate {
  template: { id: string; name: string; type: string };
  items: {
    id: string;
    title: string;
    dueDaysOffset: number;
    isMandatory: boolean;
    assigneeType: string;
    defaultAssigneeUserId: string | null;
    sortOrder: number;
  }[];
}

export interface IBoardingProcessReader {
  findActiveByEmployeeId(
    employeeId: string,
    type: "onboarding" | "offboarding",
  ): Promise<{ id: string; status: string } | null>;

  findByIdWithItems(id: string): Promise<ProcessDetail | null>;

  findByType(
    type: "onboarding" | "offboarding",
    page?: number,
    limit?: number,
  ): Promise<PaginatedProcesses>;

  findActiveTemplateByType(
    type: "onboarding" | "offboarding",
  ): Promise<ActiveTemplate | null>;
}
