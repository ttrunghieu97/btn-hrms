import { type CreateAttendanceDto } from "../dto/create-attendance.dto";
import { type UpdateAttendanceDto } from "../dto/update-attendance.dto";

type AttendanceResponseRow = {
  id: string;
  employeeId: string;
  type: string;
  time: Date;
  date: string;
  image: string | null;
  location: string | null;
  latitude: string | null;
  longitude: string | null;
  locationId: string | null;
  note: string | null;
  lunchDutyType: string | null;
  createdAt: Date;
  updatedAt: Date;
  session?: string | null;
  employee?: {
    firstName: string;
    lastName: string;
    employeeCode: string;
    avatar?: string | null;
    orgAssignments?: {
      isCurrent: boolean;
      jobTitle: string | null;
      departmentId: string | null;
    }[];
    department?: { name: string } | null;
  } | null;
};

export class AttendanceMapper {
  static toResponseDto(row: AttendanceResponseRow) {
    if (!row) return null;

    return {
      id: row.id,
      employeeId: row.employeeId,
      type: row.type,
      time: row.time,
      date: row.date,
      image: row.image,
      location: row.location,
      latitude: row.latitude,
      longitude: row.longitude,
      locationId: row.locationId,
      note: row.note,
      lunchDutyType: row.lunchDutyType,
      employee: row.employee
        ? {
            firstName: row.employee.firstName,
            lastName: row.employee.lastName,
            employeeCode: row.employee.employeeCode,
            avatar: row.employee.avatar,
            position:
              row.employee.orgAssignments?.find((assignment) => assignment.isCurrent)?.jobTitle ?? null,
            departmentName: row.employee.department?.name,
          }
        : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      session: row.session ?? null,
      ipAddress: (row as any).ipAddress ?? null,
      verificationStatus: (row as any).verificationStatus ?? null,
      flags: (row as any).flags ?? null,
    };
  }

  static toResponseDtos(rows: AttendanceResponseRow[]): ReturnType<typeof AttendanceMapper.toResponseDto>[] {
    return rows.map((row) => this.toResponseDto(row));
  }

  static toEntity(dto: CreateAttendanceDto | UpdateAttendanceDto) {
    if (!dto) return {};

    return {
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...("session" in dto && dto.session !== undefined ? { session: dto.session } : {}),
      ...(dto.location !== undefined ? { location: dto.location } : {}),
      ...("latitude" in dto && dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
      ...("longitude" in dto && dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
      ...(dto.note !== undefined ? { note: dto.note } : {}),
    };
  }
}

