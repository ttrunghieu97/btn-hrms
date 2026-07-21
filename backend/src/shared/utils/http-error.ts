import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { type ErrorCode } from "../constants/error-codes";

export type ErrorPayload = {
  message: string;
  error: ErrorCode | string;
  details?: unknown;
};

export function buildError(
  message: string,
  error: ErrorCode | string,
  details?: unknown,
): ErrorPayload {
  return { message, error, details };
}

export const errorBuilders = {
  notFound: (message: string, error: string, details?: unknown) =>
    buildError(message, error, details),
  forbidden: (message: string, error: string, details?: unknown) =>
    buildError(message, error, details),
  unauthorized: (message: string, error: string, details?: unknown) =>
    buildError(message, error, details),
  badRequest: (message: string, error: string, details?: unknown) =>
    buildError(message, error, details),
};

export function throwNotFound(
  message: string,
  error: ErrorCode | string,
  details?: unknown,
): never {
  throw new NotFoundException(buildError(message, error, details));
}

export function throwForbidden(
  message: string,
  error: ErrorCode | string,
  details?: unknown,
): never {
  throw new ForbiddenException(buildError(message, error, details));
}

export function throwUnauthorized(
  message: string,
  error: ErrorCode | string,
  details?: unknown,
): never {
  throw new UnauthorizedException(buildError(message, error, details));
}

export function throwBadRequest(
  message: string,
  error: ErrorCode | string,
  details?: unknown,
): never {
  throw new BadRequestException(buildError(message, error, details));
}

export function throwConflict(
  message: string,
  error: ErrorCode | string,
  details?: unknown,
): never {
  throw new ConflictException(buildError(message, error, details));
}

export function throwInternalServer(
  message: string,
  error: ErrorCode | string,
  details?: unknown,
): never {
  throw new InternalServerErrorException(buildError(message, error, details));
}

export function throwUnprocessable(
  message: string,
  error: ErrorCode | string,
  details?: unknown,
): never {
  throw new UnprocessableEntityException(buildError(message, error, details));
}
