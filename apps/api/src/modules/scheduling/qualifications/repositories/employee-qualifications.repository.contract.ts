import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import { type employeeQualifications, type employees, type positions } from "../../../../infrastructure/database/schema";

export type EmployeeQualificationRecord = InferSelectModel<typeof employeeQualifications>;

export type EmployeeQualificationWithNames = EmployeeQualificationRecord & {
  position?: Pick<InferSelectModel<typeof positions>, "id" | "name"> | null;
};

export type EmployeeQualificationCreateValues = InferInsertModel<typeof employeeQualifications>;

export interface IEmployeeQualificationsRepository {
  /** Get all qualifications for an employee */
  getEmployeeQualifications(employeeId: string): Promise<EmployeeQualificationWithNames[]>;

  /** Replace all qualifications for an employee. Returns the new set. */
  replaceEmployeeQualifications(
    employeeId: string,
    positionIds: string[]
  ): Promise<EmployeeQualificationWithNames[]>;
}
