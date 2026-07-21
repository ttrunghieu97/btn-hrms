export const LEAVE_READER_PORT = "LEAVE_READER_PORT";

export interface LeaveRequestInfo {
  id: string;
  employeeId: string;
  status: string;
  startDate: string;
  endDate: string;
}

export interface ILeaveReaderPort {
  findApprovedLeavesByEmployeeIds(
    employeeIds: string[],
    date: string,
  ): Promise<LeaveRequestInfo[]>;
}
