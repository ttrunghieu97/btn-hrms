import { PipeTransform, Injectable, ArgumentMetadata } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate, type ValidationError } from "class-validator";
import { normalizeValidationErrors } from "../../../shared/utils/validation-errors";
import { throwBadRequest } from "../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../shared/constants/error-codes";
import { normalizeDdMmYyyyToIsoDate } from "../../../shared/utils/date-format";

function isRecord(value: any  ): value is Record<string, any> /* eslint-disable-line @typescript-eslint/no-explicit-any */ {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

@Injectable()
export class EmployeeDataPipe implements PipeTransform {
  private parseJsonField<T>(raw: string, fieldName: string): T {
    try {
      return JSON.parse(raw) as T;
    } catch {
      throwBadRequest(
        `Validation failed: ${fieldName} must be valid JSON`,
        ERROR_CODES.VALIDATION_ERROR,
        {
          [fieldName]: ["must be valid JSON"],
        },
      );
    }
  }

  private parseIntentField<T>(value: any /* eslint-disable-line @typescript-eslint/no-explicit-any */, fieldName: string): T | undefined {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed || trimmed === "null" || trimmed === "undefined")
        return undefined;
      return this.parseJsonField<T>(trimmed, fieldName);
    }
    return value as T;
  }

  async transform(value: any /* eslint-disable-line @typescript-eslint/no-explicit-any */, metadata: ArgumentMetadata) {
    if (!value) return value;

    const data: Record<string, any> /* eslint-disable-line @typescript-eslint/no-explicit-any */ = isRecord(value) ? { ...value } : {};

    if ("email" in data) {
      const trimmed = String(data.email ?? "").trim();
      if (trimmed === "" || trimmed === "null" || trimmed === "undefined") {
        data.email = null;
      }
    }

    if (typeof data.identityCard === "string") {
      const idCard = this.parseJsonField<{
        number?: string | null;
        issuedDate?: string | null;
        issuedPlace?: string | null;
      }>(data.identityCard, "identityCard");
      data.identityNumber = idCard.number || null;
      data.identityDate = idCard.issuedDate || null;
      data.identityPlace = idCard.issuedPlace || null;
      delete data.identityCard;
    }

    data.avatar = this.parseIntentField(data.avatar, "avatar");
    data.documents = this.parseIntentField(data.documents, "documents");
    data.certifications = this.parseIntentField(
      data.certifications,
      "certifications",
    );

    if (data.avatarAttachmentId !== undefined) {
      throwBadRequest(
        "Validation failed: avatarAttachmentId must use the canonical attachment intent contract",
        ERROR_CODES.VALIDATION_ERROR,
        {
          avatarAttachmentId: [
            "must use the canonical attachment intent contract",
          ],
        },
      );
    }

    delete data.avatarAttachmentId;
    delete data.tempId;

    if (data.avatar === null) delete data.avatar;
    if (data.documents === null) delete data.documents;
    if (data.certifications === null) delete data.certifications;

    if (data.avatar !== undefined && !isRecord(data.avatar)) {
      throwBadRequest(
        "Validation failed: avatar must be a JSON object",
        ERROR_CODES.VALIDATION_ERROR,
        { avatar: ["must be a JSON object"] },
      );
    }

    if (data.documents !== undefined && !Array.isArray(data.documents)) {
      throwBadRequest(
        "Validation failed: documents must be a JSON array",
        ERROR_CODES.VALIDATION_ERROR,
        { documents: ["must be a JSON array"] },
      );
    }

    if (data.certifications !== undefined && !Array.isArray(data.certifications)) {
      throwBadRequest(
        "Validation failed: certifications must be a JSON array",
        ERROR_CODES.VALIDATION_ERROR,
        { certifications: ["must be a JSON array"] },
      );
    }

    const avatar = isRecord(data.avatar) ? data.avatar : undefined;
    if (avatar && "fileToken" in avatar) {
      throwBadRequest(
        "Validation failed: avatar.fileToken must use tempFileToken",
        ERROR_CODES.VALIDATION_ERROR,
        { "avatar.fileToken": ["must use tempFileToken"] },
      );
    }

    if (avatar?.attachmentId && avatar.tempFileToken) {
      throwBadRequest(
        "Validation failed: avatar cannot include both attachmentId and tempFileToken",
        ERROR_CODES.VALIDATION_ERROR,
        { avatar: ["cannot include both attachmentId and tempFileToken"] },
      );
    }

    if (Array.isArray(data.documents)) {
      data.documents = data.documents.map((document: unknown, index: number) => {
        if (!isRecord(document)) {
          throwBadRequest(
            `Validation failed: documents.${index} must be a JSON object`,
            ERROR_CODES.VALIDATION_ERROR,
            { [`documents.${index}`]: ["must be a JSON object"] },
          );
        }

        if (document.fileToken) {
          throwBadRequest(
            `Validation failed: documents.${index}.fileToken must use tempFileToken`,
            ERROR_CODES.VALIDATION_ERROR,
            {
              [`documents.${index}.fileToken`]: ["must use tempFileToken"],
            },
          );
        }

        if (document.attachmentId && document.tempFileToken) {
          throwBadRequest(
            `Validation failed: documents.${index} cannot include both attachmentId and tempFileToken`,
            ERROR_CODES.VALIDATION_ERROR,
            {
              [`documents.${index}`]: [
                "cannot include both attachmentId and tempFileToken",
              ],
            },
          );
        }

        return document;
      });
    }

    if (Array.isArray(data.certifications)) {
      data.certifications = data.certifications.map(
        (certification: unknown, index: number) => {
          if (!isRecord(certification)) {
            throwBadRequest(
              `Validation failed: certifications.${index} must be a JSON object`,
              ERROR_CODES.VALIDATION_ERROR,
              { [`certifications.${index}`]: ["must be a JSON object"] },
            );
          }

          if (
            certification.fileToken ||
            certification.attachmentId ||
            certification.tempFileToken
          ) {
            throwBadRequest(
              `Validation failed: certifications.${index} must use nested evidence intent`,
              ERROR_CODES.VALIDATION_ERROR,
              {
                [`certifications.${index}`]: ["must use nested evidence intent"],
              },
            );
          }

          const evidence = isRecord(certification.evidence)
            ? certification.evidence
            : undefined;
          if (evidence && "fileToken" in evidence) {
            throwBadRequest(
              `Validation failed: certifications.${index}.evidence.fileToken must use tempFileToken`,
              ERROR_CODES.VALIDATION_ERROR,
              {
                [`certifications.${index}.evidence.fileToken`]: [
                  "must use tempFileToken",
                ],
              },
            );
          }

          if (
            evidence?.attachmentId &&
            evidence.tempFileToken
          ) {
            throwBadRequest(
              `Validation failed: certifications.${index}.evidence cannot include both attachmentId and tempFileToken`,
              ERROR_CODES.VALIDATION_ERROR,
              {
                [`certifications.${index}.evidence`]: [
                  "cannot include both attachmentId and tempFileToken",
                ],
              },
            );
          }

          return certification;
        },
      );
    }

    ["dob", "startDate", "endDate", "identityDate"].forEach((dateField) => {
      if (
        data[dateField] === "" ||
        data[dateField] === "null" ||
        data[dateField] === "undefined"
      ) {
        delete data[dateField];
      }
    });

    ["dob", "startDate", "endDate", "identityDate"].forEach((dateField) => {
      if (typeof data[dateField] !== "string") return;
      const normalized = normalizeDdMmYyyyToIsoDate(data[dateField]);
      if (normalized) data[dateField] = normalized;
    });

    if (
      data.departmentId === "" ||
      data.departmentId === "null" ||
      data.departmentId === "undefined"
    ) {
      delete data.departmentId;
    }

    if (metadata.metatype) {
      const object = plainToInstance(metadata.metatype, data);
      const errors = await validate(object, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length > 0) {
        const formatErrors = (errs: ValidationError[]): string => {
          return errs
            .map((err) => {
              if (err.children && err.children.length > 0) {
                return `${err.property}: [${formatErrors(err.children)}]`;
              }
              return `${err.property}: ${Object.values(err.constraints || {}).join(", ")}`;
            })
            .join("; ");
        };

        throwBadRequest(
          `Validation failed: ${formatErrors(errors)}`,
          ERROR_CODES.VALIDATION_ERROR,
          normalizeValidationErrors(errors),
        );
      }

      return object;
    }

    return data;
  }
}



