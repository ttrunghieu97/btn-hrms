import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApiMetaDto, PaginatedMetaDto } from "../../../../shared/dto/api-response.dto";

class AttendanceEmployeeDto {
  @ApiProperty()
  username: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ type: String, nullable: true })
  employeeCode: string | null;

  @ApiProperty({ type: String, nullable: true })
  avatar: string | null;

  @ApiProperty({ type: String, nullable: true })
  position: string | null;

  @ApiProperty({ type: String, nullable: true })
  departmentName: string | null;
}

export class AttendanceResponseDto {
  @ApiProperty()
  username: string;

  @ApiProperty()
  date: string;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  morningCheckin: Date | null;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  morningCheckout: Date | null;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  noonCheck: Date | null;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  afternoonCheckin: Date | null;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  afternoonCheckout: Date | null;

  @ApiProperty({ type: String, nullable: true })
  morningCheckinImage: string | null;

  @ApiProperty({ type: String, nullable: true })
  morningCheckoutImage: string | null;

  @ApiProperty({ type: String, nullable: true })
  noonCheckImage: string | null;

  @ApiProperty({ type: String, nullable: true })
  afternoonCheckinImage: string | null;

  @ApiProperty({ type: String, nullable: true })
  afternoonCheckoutImage: string | null;

  @ApiProperty({ type: String, nullable: true })
  note: string | null;

  @ApiPropertyOptional({ 
    type: String,
    nullable: true,
    enum: ["indoor", "outdoor"],
    description: "Lunch duty type"
  })
  lunchDutyType: string | null;

  @ApiPropertyOptional({ type: AttendanceEmployeeDto })
  employee?: AttendanceEmployeeDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class AttendanceListEnvelopeDto {
  @ApiProperty({ type: [AttendanceResponseDto] })
  data: AttendanceResponseDto[];

  @ApiProperty({ type: PaginatedMetaDto })
  meta: PaginatedMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

export class AttendanceEnvelopeDto {
  @ApiProperty({ type: AttendanceResponseDto })
  data: AttendanceResponseDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

export class TodayShiftDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty()
  locationName: string;
}

export class PunchDetailDto {
  @ApiProperty({ type: String, format: "date-time" })
  time: Date;

  @ApiProperty({ type: String, nullable: true })
  image: string | null;

  @ApiProperty({ type: String, nullable: true })
  location: string | null;
}

export class TodayGeofenceDto {
  @ApiProperty({ type: String, nullable: true })
  latitude: string | null;

  @ApiProperty({ type: String, nullable: true })
  longitude: string | null;

  @ApiProperty({ type: Number, nullable: true })
  radiusMeters: number | null;
}

export class TodayAttendanceResponseDto {
  @ApiProperty({ type: TodayShiftDto, nullable: true })
  shift: TodayShiftDto | null;

  @ApiProperty({ enum: ["NO_SHIFT", "READY", "WORKING", "COMPLETED"] })
  attendanceState: "NO_SHIFT" | "READY" | "WORKING" | "COMPLETED";

  @ApiProperty({ type: PunchDetailDto, nullable: true })
  checkIn: PunchDetailDto | null;

  @ApiProperty({ type: PunchDetailDto, nullable: true })
  checkOut: PunchDetailDto | null;

  @ApiProperty()
  workingDurationSeconds: number;

  @ApiProperty({ type: TodayGeofenceDto, nullable: true })
  geofence: TodayGeofenceDto | null;

  @ApiProperty()
  canCheckIn: boolean;

  @ApiProperty()
  canCheckOut: boolean;

  @ApiProperty({ type: [String] })
  warnings: string[];
}

export class TodayAttendanceEnvelopeDto {
  @ApiProperty({ type: TodayAttendanceResponseDto })
  data: TodayAttendanceResponseDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}




