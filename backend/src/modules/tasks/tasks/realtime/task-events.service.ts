import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { Observable, Subject, interval, merge, from, EMPTY } from "rxjs";
import { catchError, mergeMap, map, toArray, startWith } from "rxjs/operators";
import type { AuthUser } from "../../../../core/security/types/auth-user.interface";
import { Permissions } from "../../../../core/security/permissions/permissions.registry";
import type { TaskResponseDto } from "../dto/task-response.dto";
import { randomUUID } from "crypto";

type SseEvent = { data: string; event?: string; id?: string; retry?: number };

export type TaskEventAction =
  | "task_created"
  | "task_updated"
  | "task_deleted"
  | "task_accepted"
  | "task_declined"
  | "task_submitted"
  | "task_approved"
  | "task_returned"
  | "task_resubmitted";

export type TaskEventPayload = {
  type: "task_event";
  action: TaskEventAction;
  taskId: string;
  task?: TaskResponseDto;
  assigneeEmployeeId?: string | null;
  actorUserId?: string | null;
  occurredAt: string;
};

@Injectable()
export class TaskEventsService {
  private readonly instanceId = randomUUID();
  private readonly heartbeatMs: number;
  private readonly replayWindowMs: number;
  private readonly streamMaxLen: number;
  private readonly streamKey = "task_events_stream";
  private readonly channel = "task_events_channel";
  private redisPub: Redis | null = null;
  private redisSub: Redis | null = null;
  private readonly globalStream = new Subject<SseEvent>();
  private readonly employeeStreams = new Map<string, Subject<SseEvent>>();

  constructor(private readonly config: ConfigService) {
    this.heartbeatMs = 15000;
    this.replayWindowMs = 60000;
    this.streamMaxLen = 5000;

    const redisUrl = String(this.config.get("REDIS_URL") || "").trim();
    if (redisUrl) {
      this.redisPub = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
      this.redisSub = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
      this.redisSub.subscribe(this.channel).catch(() => undefined);
      this.redisSub.on("message", (_channel, message) => {
        try {
          const parsed = JSON.parse(message) as {
            id?: string;
            payload: TaskEventPayload;
            instanceId?: string;
          };
          if (parsed.instanceId && parsed.instanceId === this.instanceId)
            return;
          this.emitEvent(parsed.payload, parsed.id);
        } catch {
          // ignore malformed payload
        }
      });
    }
  }

  streamForUser(user: AuthUser, lastEventId?: string): Observable<SseEvent> {
    const perms = user.permissions ?? [];
    const canViewAll =
      user.isSuperAdmin ||
      perms.includes("ALL") ||
      perms.includes("tasks:manage") ||
      perms.includes(Permissions.TASKS_VIEW);

    if (canViewAll) {
      const baseStream = this.globalStream.asObservable();
      const replay$ = this.getReplayStream(user, true, lastEventId);
      const merged$ = replay$ ? merge(replay$, baseStream) : baseStream;
      return this.withHeartbeat(merged$);
    }

    const canViewSelf =
      perms.includes("ALL") || perms.includes(Permissions.TASKS_VIEW_SELF);
    if (!canViewSelf || !user.employeeId) {
      // Route guard/policy should prevent this, but keep safe default.
      return new Observable<SseEvent>((sub) => sub.complete());
    }

    const baseStream = this.getEmployeeStream(user.employeeId).asObservable();
    const replay$ = this.getReplayStream(user, false, lastEventId);
    const merged$ = replay$ ? merge(replay$, baseStream) : baseStream;
    return this.withHeartbeat(merged$);
  }

  publishTaskEvent(payload: Omit<TaskEventPayload, "type" | "occurredAt">) {
    const event: TaskEventPayload = {
      type: "task_event",
      occurredAt: new Date().toISOString(),
      ...payload,
    };
    // Always emit locally so single-instance works even if Redis is down.
    this.emitEvent(event);

    if (this.redisPub) {
      this.redisPub
        .xadd(
          this.streamKey,
          "MAXLEN",
          "~",
          this.streamMaxLen,
          "*",
          "data",
          JSON.stringify(event),
        )
        .then((id) => {
          const message = JSON.stringify({
            id,
            payload: event,
            instanceId: this.instanceId,
          });
          this.redisPub?.publish(this.channel, message).catch(() => undefined);
        })
        .catch(() => undefined);
    }
  }

  private getEmployeeStream(employeeId: string) {
    let subject = this.employeeStreams.get(employeeId);
    if (!subject) {
      subject = new Subject<SseEvent>();
      this.employeeStreams.set(employeeId, subject);
    }
    return subject;
  }

  private emitEvent(event: TaskEventPayload, id?: string) {
    const sse: SseEvent = { data: JSON.stringify(event), id, retry: 5000 };
    this.globalStream.next(sse);
    if (event.assigneeEmployeeId) {
      this.getEmployeeStream(event.assigneeEmployeeId).next(sse);
    }
  }

  private getReplayStream(
    user: AuthUser,
    canViewAll: boolean,
    lastEventId?: string,
  ): Observable<SseEvent> | null {
    if (!this.redisPub || !this.replayWindowMs) return null;
    const startId = lastEventId
      ? lastEventId
      : `${Date.now() - this.replayWindowMs}-0`;

    return from(this.redisPub.xrange(this.streamKey, startId, "+")).pipe(
      mergeMap((entries) => from(entries)),
      mergeMap(([id, fields]) => {
        const dataIndex = fields.findIndex((v) => v === "data");
        const raw = dataIndex >= 0 ? fields[dataIndex + 1] : null;
        if (!raw) return EMPTY;
        try {
          const payload = JSON.parse(raw) as TaskEventPayload;
          if (!canViewAll && payload.assigneeEmployeeId) {
            if (String(payload.assigneeEmployeeId) !== String(user.employeeId))
              return EMPTY;
          }
          return from([
            { id, data: JSON.stringify(payload), retry: 5000 },
          ]);
        } catch {
          return EMPTY;
        }
      }),
      toArray(),
      mergeMap((items) => from(items)),
      catchError(() => EMPTY),
    );
  }

  private withHeartbeat(stream: Observable<SseEvent>) {
    if (!this.heartbeatMs) return stream;
    const heartbeat$ = interval(this.heartbeatMs).pipe(
      map(() => ({ event: "ping", data: "{}", retry: 5000 })),
      startWith({ event: "ping", data: "{}", retry: 5000 }),
    );
    return merge(stream, heartbeat$);
  }
}
