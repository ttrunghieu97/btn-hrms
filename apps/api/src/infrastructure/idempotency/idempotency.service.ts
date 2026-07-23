import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { throwBadRequest, throwConflict } from "../../shared/utils/http-error";
import { ERROR_CODES } from "../../shared/constants/error-codes";
import { MetricsService } from "../../shared/metrics/metrics.service";
import { IdempotencyRepository } from "./idempotency.repository";

type IdempotencyContext = {
  key?: string;
  actorUserId?: string | null;
  endpoint: string;
  payload: unknown;
};

export type IdempotencyBeginResult =
  | { mode: "disabled" }
  | { mode: "created"; recordId: string }
  | { mode: "replay"; responsePayload: unknown };

function stableStringify(input: unknown): string {
  if (input === null || input === undefined) return "null";
  if (typeof input !== "object") return JSON.stringify(input);
  if (Array.isArray(input)) {
    return `[${input.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = input as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(",")}}`;
}

@Injectable()
export class IdempotencyService {
  constructor(
    private readonly repo: IdempotencyRepository,
    private readonly metrics: MetricsService,
  ) {}

  beginRequest(ctx: IdempotencyContext) {
    return this.begin(ctx);
  }

  replay(responsePayload: unknown): unknown {
    this.metrics.incrementIdempotencyReplay();
    return responsePayload;
  }

  completeRequest(recordId: string, responsePayload: unknown) {
    return this.complete(recordId, responsePayload);
  }

  failRequest(recordId: string, error: unknown) {
    return this.fail(recordId, error);
  }

  private buildRequestHash(payload: unknown): string {
    const normalized = stableStringify(payload);
    return createHash("sha256").update(normalized).digest("hex");
  }

  private async begin(ctx: IdempotencyContext): Promise<IdempotencyBeginResult> {
    const key = (ctx.key ?? "").trim();
    if (!key) {
      return { mode: "disabled" };
    }
    if (key.length > 255) {
      throwBadRequest("Idempotency-Key exceeds 255 characters", ERROR_CODES.INVALID_REQUEST);
    }

    const actorUserId = ctx.actorUserId ?? null;
    const requestHash = this.buildRequestHash(ctx.payload);

    const inserted = await this.repo.insertPending({
      actorUserId,
      endpoint: ctx.endpoint,
      idempotencyKey: key,
      requestHash,
    });

    if (inserted[0]?.id) {
      return { mode: "created", recordId: inserted[0].id };
    }

    const existing = await this.repo.findByKey({
      actorUserId,
      endpoint: ctx.endpoint,
      idempotencyKey: key,
    });

    if (!existing) {
      throwConflict("Could not start idempotent request", ERROR_CODES.IDEMPOTENCY_CONFLICT);
    }

    if (existing.requestHash !== requestHash) {
      throwConflict(
        "Idempotency key has already been used with a different payload",
        ERROR_CODES.IDEMPOTENCY_CONFLICT,
        {
          endpoint: ctx.endpoint,
          idempotencyKey: key,
        },
      );
    }

    if (existing.status === "completed") {
      return {
        mode: "replay",
        responsePayload: existing.responsePayload,
      };
    }

    if (existing.status === "failed") {
      // If previous request failed, allow client to retry by updating status back to pending
      await this.repo.resetToPending({ id: existing.id, requestHash });
      return { mode: "created", recordId: existing.id };
    }

    throwConflict(
      "A request with this Idempotency-Key is still being processed",
      ERROR_CODES.IDEMPOTENCY_IN_PROGRESS,
      {
        endpoint: ctx.endpoint,
        idempotencyKey: key,
      },
    );
  }

  private async complete(recordId: string, responsePayload: unknown) {
    await this.repo.markCompleted({ id: recordId, responsePayload });
  }

  private async fail(recordId: string, error: unknown) {
    const errorRecord =
      typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;
    const payload = {
      name: typeof errorRecord?.name === "string" ? errorRecord.name : "Error",
      message: typeof errorRecord?.message === "string" ? errorRecord.message : "Unknown error",
    };

    await this.repo.markFailed({ id: recordId, errorPayload: payload });
  }
}
