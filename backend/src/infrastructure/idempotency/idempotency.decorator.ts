import { SetMetadata, UseInterceptors } from "@nestjs/common";
import { IdempotencyInterceptor } from "./idempotency.interceptor";

export const IDEMPOTENCY_KEY = "idempotency";

export type IdempotencyMetadata = {
  endpoint: string;
};

export function Idempotent(endpoint: string) {
  return function (
    target: object,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) {
    SetMetadata(IDEMPOTENCY_KEY, { endpoint })(
      target,
      propertyKey!,
      descriptor!,
    );
    UseInterceptors(IdempotencyInterceptor)(
      target,
      propertyKey!,
      descriptor!,
    );
  };
}
