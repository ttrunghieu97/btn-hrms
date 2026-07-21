import { type EmployeeSnapshotDto } from "./dtos/employee-snapshot.dto";
import { type PositionSnapshotDto } from "./dtos/position-snapshot.dto";
import { type ShiftContextDto } from "./dtos/shift-context.dto";


export interface IWorkforceFacade {
  getEmployeeAsOfDate(employeeId: string, asOfDate: Date): Promise<EmployeeSnapshotDto>;
  getDepartmentTree(asOfDate?: Date): Promise<unknown>;
  getPositionDetails(positionId: string, asOfDate: Date): Promise<PositionSnapshotDto>;
  getEmployeeShiftContext(employeeId: string, from: Date, to: Date): Promise<ShiftContextDto[]>;
}



