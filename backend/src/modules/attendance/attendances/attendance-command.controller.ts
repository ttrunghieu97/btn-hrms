import {
  Controller,
  Post,
  Body,
  Request,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags, ApiBody, ApiOkResponse } from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { AuthUser } from "../../../core/security/types/auth-user.interface";
import { CheckPolicy } from "../../../core/security/decorators/check-policy.decorator";
import { AttendancePolicies } from "../../../core/security/policies/attendance.policy";
import { Idempotent } from "../../../infrastructure/idempotency/idempotency.decorator";
import { createMemoryFileInterceptor, uploadPolicy } from "../../../shared/upload/upload-policy";
import { CheckAttendanceDto } from "./dto/check-attendance.dto";
import { CreateAttendanceDto } from "./dto/create-attendance.dto";
import { AttendanceAliasDto } from "./dto/attendance-alias.dto";
import { AttendanceEnvelopeDto } from "./dto/attendance-response.dto";
import { CheckAttendanceFromWebUseCase } from "./use-cases/check-attendance-from-web.usecase";
import { CheckAttendanceUseCase } from "./use-cases/check-attendance.usecase";
import { AttendanceCapturePolicyService } from "./services/attendance-capture-policy.service";
import { throwBadRequest } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";

const ATTENDANCE_IMAGE_MIME_TYPES = uploadPolicy.mimeTypes.image;

@ApiTags("Attendance Commands")
@ApiBearerAuth()
@Controller()
export class AttendanceCommandController {
  constructor(
    private readonly checkFromWeb: CheckAttendanceFromWebUseCase,
    private readonly checkAttendance: CheckAttendanceUseCase,
    private readonly attendanceCapturePolicy: AttendanceCapturePolicyService,
  ) {}

  @Post("check")
  @CheckPolicy(AttendancePolicies.check)
  @Idempotent("POST:/attendances/check")
  @ApiOperation({ summary: "Check attendance (web app format)" })
  @ApiOkResponse({ type: AttendanceEnvelopeDto })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        date: { type: "string", example: "2026-03-14" },
        session: { type: "string", enum: ["morning", "noon", "afternoon"] },
        type: { type: "string", enum: ["checkin", "checkout", "check", "note"] },
        note: { type: "string" },
        latitude: { type: "string" },
        longitude: { type: "string" },
        location: { type: "string" },
        imageSource: { type: "string", enum: ["camera", "upload"] },
        lunchDutyType: { type: "string", enum: ["indoor", "outdoor"] },
        image: { type: "string", format: "binary" },
      },
      required: ["date", "session", "type"],
    },
  })
  @ApiConsumes("multipart/form-data")

  @UseInterceptors(createMemoryFileInterceptor("image", ATTENDANCE_IMAGE_MIME_TYPES))
  async checkAttendanceFromWeb(
    @Request() req: ExpressRequest & { user: AuthUser },
    @Body() body: CheckAttendanceDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      throwBadRequest("Employee profile is required", ERROR_CODES.EMPLOYEE_PROFILE_REQUIRED, { userId: req.user?.id ?? null });
    }
    if (body.type === "checkin" || body.type === "checkout") {
      this.attendanceCapturePolicy.assertImageSourceAllowed(body.imageSource);
    }
    return this.checkFromWeb.execute(employeeId, body.date, body.session, body.type, file?.path, body.note, body.latitude, body.longitude, body.location, {
      ipAddress: extractClientIp(req),
      selfie: file?.buffer ? { buffer: file.buffer, mime: file.mimetype } : undefined,
      uploadedBy: req.user.id,
    }, body.lunchDutyType);
  }

  @Post()
  @CheckPolicy(AttendancePolicies.check)
  @ApiOperation({ summary: "Create an attendance event (check-in/out, etc.)" })
  @ApiOkResponse({ type: AttendanceEnvelopeDto })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        image: { type: "string", format: "binary" },
        type: { type: "string", enum: ["check_in", "check_out", "break_start", "break_end"] },
        location: { type: "string" },
        latitude: { type: "string" },
        longitude: { type: "string" },
        note: { type: "string" },
        imageSource: { type: "string", enum: ["camera", "upload"] },
      },
    },
  })
  @UseInterceptors(createMemoryFileInterceptor("image", ATTENDANCE_IMAGE_MIME_TYPES))
  async createEvent(
    @Request() req: ExpressRequest & { user: AuthUser },
    @Body() body: CreateAttendanceDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      throwBadRequest("Employee profile is required", ERROR_CODES.EMPLOYEE_PROFILE_REQUIRED, { userId: req.user?.id ?? null });
    }
    if (body.type === "check_in" || body.type === "check_out") {
      this.attendanceCapturePolicy.assertImageSourceAllowed(body.imageSource);
    }
    return this.checkAttendance.execute(
      employeeId,
      body.type,
      file?.path,
      body.location,
      body.note,
      undefined,
      undefined,
      body.latitude,
      body.longitude,
      {
        ipAddress: extractClientIp(req),
        selfie: file?.buffer
          ? { buffer: file.buffer, mime: file.mimetype }
          : undefined,
      },
    );
  }

  @Post("log")
  @CheckPolicy(AttendancePolicies.check)
  @ApiOperation({ summary: "Create attendance event (deprecated)", deprecated: true })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(createMemoryFileInterceptor("image", ATTENDANCE_IMAGE_MIME_TYPES))
  async logEventLegacy(
    @Request() req: ExpressRequest & { user: AuthUser },
    @Body() body: CreateAttendanceDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.createEvent(req, body, file);
  }

  @Post("check-in")
  @Idempotent("POST:/attendance/check-in")
  @CheckPolicy(AttendancePolicies.check)
  @ApiOperation({ summary: "Check in (alias)" })
  async checkIn(@Request() req: { user: AuthUser }, @Body() body: AttendanceAliasDto) {
    const employeeId = req.user.employeeId;
    if (!employeeId) throwBadRequest("Employee profile required", ERROR_CODES.EMPLOYEE_PROFILE_REQUIRED);
    return this.checkAttendance.execute(employeeId, "check_in", undefined, body.location, body.note, "morning");
  }

  @Post("check-out")
  @Idempotent("POST:/attendance/check-out")
  @CheckPolicy(AttendancePolicies.check)
  @ApiOperation({ summary: "Check out (alias)" })
  async checkOut(@Request() req: { user: AuthUser }, @Body() body: AttendanceAliasDto) {
    const employeeId = req.user.employeeId;
    if (!employeeId) throwBadRequest("Employee profile required", ERROR_CODES.EMPLOYEE_PROFILE_REQUIRED);
    return this.checkAttendance.execute(employeeId, "check_out", undefined, body.location, body.note, "morning");
  }
}

function extractClientIp(req: ExpressRequest): string | null {
  if (typeof req.ip === "string" && req.ip.length > 0) return req.ip;
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.socket?.remoteAddress ?? null;
}
