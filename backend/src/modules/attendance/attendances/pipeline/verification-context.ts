/**
 * AttendanceVerificationContext — shared context passed through the pipeline.
 *
 * Each step reads from and may write to this context. The pipeline runner
 * merges all step results into the final attendance record.
 */

export type PunchType = "check_in" | "check_out" | "break_start" | "break_end" | "note";
export type SessionType = "morning" | "noon" | "afternoon";
export type VerificationStatus = "verified" | "flagged" | "rejected";

export type EmployeeContext = {
  employeeId: string;
  userId: string;
  departmentId: string | null;
  employmentStatus: string;
  currentSite?: {
    id: string;
    latitude: string | null;
    longitude: string | null;
    radiusMeters: number | null;
    allowedIpCidrs: string[] | null;
  } | null;
  currentSiteId?: string | null;
};

export class AttendanceVerificationContext {
  readonly employeeId: string;
  readonly type: PunchType;
  readonly session?: SessionType;
  readonly dateOverride?: string;
  readonly location?: string;
  readonly latitude?: string;
  readonly longitude?: string;
  readonly ipAddress?: string | null;
  readonly selfieBuffer?: Buffer;
  readonly selfieMime?: string;
  readonly uploadedBy?: string;

  // Populated by pipeline steps
  employeeContext?: EmployeeContext;
  distanceMeters: number | null = null;
  selfieS3Key: string | null = null;
  selfieUrl?: string;
  verificationStatus: VerificationStatus = "verified";
  flags: Record<string, boolean> = {};

  constructor(params: {
    employeeId: string;
    type: PunchType;
    session?: SessionType;
    dateOverride?: string;
    location?: string;
    latitude?: string;
    longitude?: string;
    ipAddress?: string | null;
    selfieBuffer?: Buffer;
    selfieMime?: string;
    uploadedBy?: string;
  }) {
    this.employeeId = params.employeeId;
    this.type = params.type;
    this.session = params.session;
    this.dateOverride = params.dateOverride;
    this.location = params.location;
    this.latitude = params.latitude;
    this.longitude = params.longitude;
    this.ipAddress = params.ipAddress;
    this.selfieBuffer = params.selfieBuffer;
    this.selfieMime = params.selfieMime;
    this.uploadedBy = params.uploadedBy;
  }
}
