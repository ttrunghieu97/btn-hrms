import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InstantiateTaskTemplateUseCase } from "../../task-templates/use-cases";
import { TaskRecurrenceRepository } from "../repositories/task-recurrence.repository";
import { RedisService } from "../../../../infrastructure/redis/redis.service";
import { withCronLease } from "../../../../shared/utils/cron-lease.util";

const CRON_FIELD_RANGES = [
  { min: 0, max: 59 },
  { min: 0, max: 23 },
  { min: 1, max: 31 },
  { min: 1, max: 12 },
  { min: 0, max: 6 },
] as const;

type CronFieldRange = (typeof CRON_FIELD_RANGES)[number];

type DayOfWeekNormalizer = (value: number) => number;

interface TaskRecurrence {
  id: string;
  templateId: string;
  cronExpression: string;
}

interface CreatedTask {
  id: string;
}

function normalizeDayOfWeek(value: number) {
  return value === 7 ? 0 : value;
}

function expandCronPart(
  part: string,
  range: CronFieldRange,
  normalize: DayOfWeekNormalizer = (value) => value,
) {
  const values = new Set<number>();
  const segments = part.split(",");

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    const [basePart, stepPart] = trimmed.split("/");
    const base = basePart ?? "";
    const step = stepPart ? Number(stepPart) : 1;
    if (!Number.isInteger(step) || step <= 0) {
      throw new Error(`Invalid cron step: ${segment}`);
    }

    const apply = (start: number, end: number) => {
      for (let value = start; value <= end; value += step) {
        values.add(normalize(value));
      }
    };

    if (base === "*") {
      apply(range.min, range.max);
      continue;
    }

    if (base.includes("-")) {
      const [startRaw, endRaw] = base.split("-");
      const start = Number(startRaw);
      const end = Number(endRaw);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
        throw new Error(`Invalid cron range: ${segment}`);
      }
      apply(start, end);
      continue;
    }

    const value = Number(base);
    if (!Number.isInteger(value)) {
      throw new Error(`Invalid cron value: ${segment}`);
    }
    apply(value, value);
  }

  return [...values]
    .filter((value) => value >= range.min && value <= range.max)
    .sort((a, b) => a - b);
}

function parseCronExpression(expression: string) {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`Unsupported cron expression: ${expression}`);
  }

  return parts.map((part, index) => {
    const range = CRON_FIELD_RANGES[index];
    if (!range) {
      throw new Error(`Unsupported cron expression: ${expression}`);
    }
    return expandCronPart(
      part,
      range,
      index === 4 ? normalizeDayOfWeek : undefined,
    );
  }) as [number[], number[], number[], number[], number[]];
}

function matchesDate(expression: string, date: Date) {
  const [minutes, hours, daysOfMonth, months, daysOfWeek] =
    parseCronExpression(expression);
  return (
    minutes.includes(date.getUTCMinutes()) &&
    hours.includes(date.getUTCHours()) &&
    daysOfMonth.includes(date.getUTCDate()) &&
    months.includes(date.getUTCMonth() + 1) &&
    daysOfWeek.includes(date.getUTCDay())
  );
}

function computeNextRunAt(expression: string, from: Date) {
  const candidate = new Date(from);
  candidate.setUTCSeconds(0, 0);
  candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);

  const limit = 366 * 24 * 60;
  for (let i = 0; i < limit; i += 1) {
    if (matchesDate(expression, candidate)) {
      return candidate;
    }
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  }

  throw new Error(`Unable to compute next run for cron expression: ${expression}`);
}

export { computeNextRunAt };

async function processRecurrence(
  recurrence: TaskRecurrence,
  now: Date,
  instantiateTaskTemplate: InstantiateTaskTemplateUseCase,
  repo: TaskRecurrenceRepository,
) {
  const created = (await instantiateTaskTemplate.execute(
    recurrence.templateId,
    {},
    "SYSTEM_RECURRENCE",
  )) as CreatedTask;

  await repo.updateRecurrence({
    id: recurrence.id,
    lastCreatedTaskId: created.id,
    nextRunAt: computeNextRunAt(recurrence.cronExpression, now),
  });

  return created;
}

function chunk<T>(items: T[], size: number) {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

async function processBatch(
  pending: TaskRecurrence[],
  now: Date,
  instantiateTaskTemplate: InstantiateTaskTemplateUseCase,
  repo: TaskRecurrenceRepository,
  logger: Logger,
) {
  await Promise.allSettled(
    pending.map(async (recurrence) => {
      try {
        const created = await processRecurrence(
          recurrence,
          now,
          instantiateTaskTemplate,
          repo,
        );
        logger.log(
          `Created automated task ${created.id} from recurrence ${recurrence.id}`,
        );
      } catch (e: any) {
        logger.error(
          `Failed to process recurrence ${recurrence.id}: ${e.message}`,
          e.stack,
        );
      }
    }),
  );
}

async function processPendingRecurrences(
  pending: TaskRecurrence[],
  now: Date,
  instantiateTaskTemplate: InstantiateTaskTemplateUseCase,
  repo: TaskRecurrenceRepository,
  logger: Logger,
) {
  for (const batch of chunk(pending, 10)) {
    await processBatch(batch, now, instantiateTaskTemplate, repo, logger);
  }
}

export { processPendingRecurrences };

@Injectable()
export class TaskRecurrenceService {
  private readonly logger = new Logger(TaskRecurrenceService.name);

  constructor(
    private readonly repo: TaskRecurrenceRepository,
    private readonly instantiateTaskTemplate: InstantiateTaskTemplateUseCase,
    private readonly redis: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processRecurringTasks() {
    await withCronLease(
      this.redis.getClientOrNull(),
      "hrms:cron-lease:tasks:recurrence",
      90,
      () => this.logger.debug("Skipping recurring tasks because another instance holds the lease"),
      async () => {
        this.logger.debug("Checking for recurring tasks to process...");

        const now = new Date();
        const pending = (await this.repo.findPendingRecurrences(now)) as TaskRecurrence[];
        await processPendingRecurrences(
          pending,
          now,
          this.instantiateTaskTemplate,
          this.repo,
          this.logger,
        );
      },
    );
  }
}


