import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Response } from "express";
import { randomUUID } from "crypto";
import { RequestContextService } from "../context/request-context.service";
import { normalizeValidationErrors } from "../utils/validation-errors";
import { captureException } from "../observability/sentry";
import {
  getDbErrorCode,
  getDbErrorConstraint,
  getDbErrorDetail,
} from "../utils/db-errors";

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly requestContext: RequestContextService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (response.headersSent) {
      if (exception instanceof Error) {
        captureException(exception, {
          req: request,
          user: (request as any).user,
        });
      }
      return;
    }

    const dbError = this.mapDatabaseError(exception);
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : dbError?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : dbError
          ? {
              message: dbError.message,
              error: dbError.code,
              details: dbError.details,
            }
          : null;

    const message =
      typeof exceptionResponse === "object" && exceptionResponse !== null
        ? (exceptionResponse as any).message || (exceptionResponse as any).error
        : (exception as any).message || "Internal server error";

    const validationDetails =
      typeof exceptionResponse === "object" && exceptionResponse !== null
        ? (exceptionResponse as any).details ||
          (exceptionResponse as any).errors ||
          (Array.isArray((exceptionResponse as any).message)
            ? (exceptionResponse as any).message
            : undefined)
        : Array.isArray(message)
          ? message
          : undefined;

    const errorCode =
      typeof exceptionResponse === "object" && exceptionResponse !== null
        ? (exceptionResponse as any).error ||
          this.mapStatusToCode(status, !!validationDetails)
        : this.mapStatusToCode(status, false);

    const details = this.normalizeDetails(validationDetails);

    const requestId =
      this.requestContext.get()?.requestId ||
      (request as any).id ||
      (request as any).headers?.["x-request-id"] ||
      randomUUID();

    if (!response.getHeader("x-request-id")) {
      response.setHeader("x-request-id", requestId);
    }

    if (status >= 500) {
      captureException(exception, {
        req: request,
        user: (request as any).user,
      });
    }

    const timestamp = new Date().toISOString();

    response.status(status).json({
      data: null,
      meta: {
        requestId: String(requestId || ""),
        timestamp,
      },
      error: {
        code: errorCode.toString().toUpperCase().replace(/\s+/g, "_"),
        message: Array.isArray(message) ? message[0] : message,
        statusCode: status,
        details,
      },
    });
  }

  private mapStatusToCode(status: number, hasValidationDetails: boolean) {
    if (status === HttpStatus.BAD_REQUEST && hasValidationDetails)
      return "VALIDATION_ERROR";
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "INVALID_REQUEST";
      case HttpStatus.UNAUTHORIZED:
        return "UNAUTHORIZED";
      case HttpStatus.FORBIDDEN:
        return "FORBIDDEN";
      case HttpStatus.NOT_FOUND:
        return "NOT_FOUND";
      case HttpStatus.CONFLICT:
        return "CONFLICT";
      case HttpStatus.TOO_MANY_REQUESTS:
        return "RATE_LIMITED";
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return "UNPROCESSABLE_ENTITY";
      case HttpStatus.SERVICE_UNAVAILABLE:
        return "SERVICE_UNAVAILABLE";
      default:
        return "INTERNAL_ERROR";
    }
  }

  private normalizeDetails(details: unknown) {
    if (!Array.isArray(details) || details.length === 0) return details;
    const first = details[0];
    if (first && (first.property || first.constraints || first.children)) {
      return normalizeValidationErrors(details as any);
    }
    return details;
  }

  private mapDatabaseError(exception: unknown):
    | { status: number; code: string; message: string; details?: unknown }
    | null {
    const code = getDbErrorCode(exception);
    if (!code || !/^\d/.test(code)) return null;

    const detail = getDbErrorDetail(exception) ?? "";
    const constraint = getDbErrorConstraint(exception) ?? "";
    const message = (exception as any).message ?? "";
    const dbField = this.extractDbFieldName(detail, constraint, message);
    const label = this.toDisplayFieldName(dbField);


    const camelCaseMap: Record<string, string> = {
      department_id: "departmentId",
      position_id: "positionId",
      employee_code: "employeeCode",
      first_name: "firstName",
      last_name: "lastName",
      phone_number: "phoneNumber",
      identity_number: "identityNumber",
      identity_place: "identityPlace",
      user_id: "userId",
    };

    const field =
      dbField && camelCaseMap[dbField] ? camelCaseMap[dbField] : dbField;

    switch (code) {
      case "23505":
        return {
          status: HttpStatus.CONFLICT,
          code: "CONFLICT",
          message: label
            ? `${label} already exists`
            : "A record with the same value already exists",
          details: field ? { field } : undefined,
        };
      case "23502":
        return {
          status: HttpStatus.BAD_REQUEST,
          code: "VALIDATION_ERROR",
          message: label ? `${label} is required` : "A required field is missing",
          details: field ? { field } : undefined,
        };
      case "23503":
        return {
          status: HttpStatus.BAD_REQUEST,
          code: "INVALID_REQUEST",
          message: label
            ? `${label} is invalid or does not exist`
            : "A referenced record does not exist",
          details: field ? { field } : undefined,
        };
      case "22P02":
        return {
          status: HttpStatus.BAD_REQUEST,
          code: "VALIDATION_ERROR",
          message: label ? `${label} has invalid format` : "Invalid input format",
          details: field ? { field } : undefined,
        };
      case "22007":
        return {
          status: HttpStatus.BAD_REQUEST,
          code: "VALIDATION_ERROR",
          message: label ? `${label} has invalid date format` : "Invalid date format",
          details: field ? { field } : undefined,
        };
      case "23514":
        return {
          status: HttpStatus.BAD_REQUEST,
          code: "VALIDATION_ERROR",
          message: "Submitted data violates a business validation rule",
          details: constraint ? { constraint } : undefined,
        };
      default:
        return {
          status: HttpStatus.BAD_REQUEST,
          code: "INVALID_REQUEST",
          message: "Database validation failed",
          details: { code, constraint: constraint || undefined },
        };
    }
  }

  private extractDbFieldName(detail: string, constraint: string, message: string): string | null {
    const fieldMatch =
      detail.match(/Key \(([^)]+)\)=/i)?.[1] ??
      message.match(/column \"([^\"]+)\"/i)?.[1] ??
      detail.match(/column \"([^\"]+)\"/i)?.[1];
    if (fieldMatch) return fieldMatch;

    const normalizedConstraint = constraint.toLowerCase();
    if (normalizedConstraint.includes("employee_code")) return "employee_code";
    if (normalizedConstraint.includes("username")) return "username";
    if (normalizedConstraint.includes("email")) return "email";
    if (normalizedConstraint.includes("department")) return "department_id";
    if (normalizedConstraint.includes("position")) return "position_id";
    return null;
  }

  private toDisplayFieldName(field: string | null): string | null {
    if (!field) return null;

    const aliasMap: Record<string, string> = {
      username: "Username",
      email: "Email",
      employee_code: "Employee code",
      first_name: "First name",
      last_name: "Last name",
      phone_number: "Phone number",
      identity_number: "Identity number",
      identity_place: "Identity place",
      department_id: "Department",
      position_id: "Position",
      user_id: "User",
    };

    const alias = aliasMap[field];
    if (alias) return alias;
    return field
      .split(",")[0]!
      .trim()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
