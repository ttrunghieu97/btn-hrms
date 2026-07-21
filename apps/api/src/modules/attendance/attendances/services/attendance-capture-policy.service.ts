import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { resolveAppEnv, isAttendanceImageUploadAllowed } from "../../../../shared/config/app-env";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { throwForbidden } from "../../../../shared/utils/http-error";
import type { CheckAttendanceImageSource } from "../dto/check-attendance.dto";

@Injectable()
export class AttendanceCapturePolicyService {
  constructor(private readonly config: ConfigService) {}

  assertImageSourceAllowed(imageSource: CheckAttendanceImageSource | undefined): void {
    if (isAttendanceImageUploadAllowed(this.config)) return;
    if (imageSource === "camera") return;

    throwForbidden(
      "Manual attendance image upload is disabled in this environment",
      ERROR_CODES.ATTENDANCE_IMAGE_UPLOAD_FORBIDDEN,
      {
        field: "imageSource",
        imageSource: imageSource ?? "unspecified",
        allowedSource: "camera",
        appEnv: resolveAppEnv(this.config),
      },
    );
  }
}



