import { Injectable } from "@nestjs/common";
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from "prom-client";

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly httpHistogram: Histogram<string>;
  private readonly idempotencyReplayCounter: Counter<string>;
  private readonly contractValidationFailedCounter: Counter<string>;

  private readonly eventDispatchLagHistogram: Histogram<string>;
  private readonly eventProcessingLagHistogram: Histogram<string>;
  private readonly outboxPendingGauge: Gauge<string>;
  private readonly outboxOldestUnpublishedAgeGauge: Gauge<string>;
  private readonly outboxDispatchFailuresCounter: Counter<string>;
  private readonly outboxPublishedCounter: Counter<string>;
  private readonly outboxRetryCounter: Counter<string>;
  private readonly outboxDeadLetterCounter: Counter<string>;
  private readonly outboxEventsCreatedCounter: Counter<string>;
  private readonly kafkaEventsPublishedCounter: Counter<string>;
  private readonly kafkaEventsConsumedCounter: Counter<string>;
  private readonly consumerProcessingErrorsCounter: Counter<string>;
  private readonly dlqEventsRoutedCounter: Counter<string>;

  // File upload metrics
  private readonly uploadSuccessCounter: Counter<string>;
  private readonly uploadFailureCounter: Counter<string>;
  private readonly uploadDurationHistogram: Histogram<string>;
  private readonly virusScanResultsCounter: Counter<string>;
  private readonly imageProcessedCounter: Counter<string>;


  // ── Attendance-specific metrics ──────────────────────────────────
  private readonly attendanceCheckCounter: Counter<string>;
  private readonly attendanceCheckDuration: Histogram<string>;
  private readonly attendanceVerificationDuration: Histogram<string>;
  private readonly attendanceUploadDuration: Histogram<string>;
  private readonly attendanceGeoFailTotal: Counter<string>;
  private readonly attendanceIpFailTotal: Counter<string>;
  private readonly attendanceFaceFailTotal: Counter<string>;
  private readonly attendanceDuplicateTotal: Counter<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry });
    this.httpHistogram = new Histogram({
      name: "http_request_duration_ms",
      help: "HTTP request duration in ms",
      labelNames: ["method", "path", "statusCode"],
      buckets: [10, 50, 100, 200, 300, 500, 1000, 2000, 5000],
      registers: [this.registry],
    });
    this.idempotencyReplayCounter = new Counter({
      name: "idempotency_replay_total",
      help: "Total number of idempotent request replays",
      registers: [this.registry],
    });
    this.contractValidationFailedCounter = new Counter({
      name: "contract_validation_failed_total",
      help: "Total number of contract validation or compatibility failures",
      registers: [this.registry],
    });

    this.eventDispatchLagHistogram = new Histogram({
      name: "event_dispatch_lag_ms",
      help: "Time from event occurredAt to Kafka publish in ms",
      labelNames: ["topic"],
      buckets: [50, 100, 500, 1000, 5000, 10000, 30000, 60000],
      registers: [this.registry],
    });
    this.eventProcessingLagHistogram = new Histogram({
      name: "event_processing_lag_ms",
      help: "Time from event occurredAt to successful consumer processing in ms",
      labelNames: ["consumer_group", "topic", "event_type"],
      buckets: [50, 100, 500, 1000, 5000, 10000, 30000, 60000],
      registers: [this.registry],
    });
    this.outboxPendingGauge = new Gauge({
      name: "outbox_pending_events_total",
      help: "Current count of unprocessed events in the outbox table",
      registers: [this.registry],
    });
    this.outboxOldestUnpublishedAgeGauge = new Gauge({
      name: "outbox_oldest_unpublished_age_ms",
      help: "Age in ms of the oldest unpublished outbox row",
      registers: [this.registry],
    });
    this.outboxDispatchFailuresCounter = new Counter({
      name: "outbox_dispatch_failures_total",
      help: "Total number of outbox dispatch failures",
      registers: [this.registry],
    });
    this.outboxPublishedCounter = new Counter({
      name: "outbox_events_published_total",
      help: "Total outbox events successfully published",
      labelNames: ["event_type"],
    });
    this.outboxRetryCounter = new Counter({
      name: "outbox_events_retry_total",
      help: "Total outbox event publish retries attempted",
      labelNames: ["event_type"],
    });
    this.outboxDeadLetterCounter = new Counter({
      name: "outbox_events_dead_letter_total",
      help: "Total outbox events that exhausted retries (dead-lettered)",
      labelNames: ["event_type"],
    });
    this.outboxEventsCreatedCounter = new Counter({
      name: "outbox_events_created_total",
      help: "Total number of domain events appended to the outbox",
      labelNames: ["topic", "event_type"],
      registers: [this.registry],
    });
    this.kafkaEventsPublishedCounter = new Counter({
      name: "kafka_events_published_total",
      help: "Total number of events successfully published to Kafka",
      labelNames: ["topic"],
      registers: [this.registry],
    });
    this.kafkaEventsConsumedCounter = new Counter({
      name: "kafka_events_consumed_total",
      help: "Total number of events processed by a consumer (success or skipped)",
      labelNames: ["consumer_group", "topic", "event_type", "status"],
      registers: [this.registry],
    });
    this.consumerProcessingErrorsCounter = new Counter({
      name: "consumer_processing_errors_total",
      help: "Total number of consumer errors thrown during event processing",
      labelNames: ["consumer_group"],
      registers: [this.registry],
    });
    this.dlqEventsRoutedCounter = new Counter({
      name: "dlq_events_routed_total",
      help: "Total number of events routed to the Dead Letter Queue",
      registers: [this.registry],
    });

    this.uploadSuccessCounter = new Counter({
      name: "upload_success_total",
      help: "Total number of successful file uploads",
      labelNames: ["purpose"],
      registers: [this.registry],
    });
    this.uploadFailureCounter = new Counter({
      name: "upload_failure_total",
      help: "Total number of failed file uploads",
      labelNames: ["purpose", "reason"],
      registers: [this.registry],
    });
    this.uploadDurationHistogram = new Histogram({
      name: "upload_duration_seconds",
      help: "File upload duration in seconds",
      labelNames: ["purpose"],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    });
    this.virusScanResultsCounter = new Counter({
      name: "virus_scan_results_total",
      help: "Total number of virus scans by result",
      labelNames: ["result"],
      registers: [this.registry],
    });
    this.imageProcessedCounter = new Counter({
      name: "image_processed_total",
      help: "Total number of images processed (e.g. thumbnail generation)",
      labelNames: ["operation", "status"],
      registers: [this.registry],
    });

    // ── Attendance metrics ──────────────────────────────────────
    this.attendanceCheckCounter = new Counter({
      name: "attendance_check_total",
      help: "Total number of attendance check operations",
      labelNames: ["type", "status", "verification"],
      registers: [this.registry],
    });
    this.attendanceCheckDuration = new Histogram({
      name: "attendance_check_duration_ms",
      help: "Duration of attendance check operation in ms",
      labelNames: ["type"],
      buckets: [50, 100, 200, 500, 1000, 2000, 5000],
      registers: [this.registry],
    });
    this.attendanceVerificationDuration = new Histogram({
      name: "attendance_verification_duration_ms",
      help: "Duration of each verification step in ms",
      labelNames: ["step", "status"],
      buckets: [10, 25, 50, 100, 200, 500, 1000],
      registers: [this.registry],
    });
    this.attendanceUploadDuration = new Histogram({
      name: "attendance_upload_duration_ms",
      help: "Duration of evidence upload in ms",
      labelNames: ["type"],
      buckets: [50, 100, 200, 500, 1000, 2000, 5000],
      registers: [this.registry],
    });
    this.attendanceGeoFailTotal = new Counter({
      name: "attendance_geo_fail_total",
      help: "Total number of geofence verification failures",
      labelNames: ["site_id"],
      registers: [this.registry],
    });
    this.attendanceIpFailTotal = new Counter({
      name: "attendance_ip_fail_total",
      help: "Total number of IP whitelist verification failures",
      labelNames: ["site_id"],
      registers: [this.registry],
    });
    this.attendanceFaceFailTotal = new Counter({
      name: "attendance_face_fail_total",
      help: "Total number of face detection failures",
      labelNames: ["reason"],
      registers: [this.registry],
    });
    this.attendanceDuplicateTotal = new Counter({
      name: "attendance_duplicate_total",
      help: "Total number of duplicate attendance attempts prevented",
      labelNames: [],
      registers: [this.registry],
    });
  }

  observeHttp(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
  ) {
    this.httpHistogram.observe(
      { method, path, statusCode: String(statusCode) },
      durationMs,
    );
  }

  incrementIdempotencyReplay(): void {
    this.idempotencyReplayCounter.inc();
  }

  incrementContractValidationFailed(): void {
    this.contractValidationFailedCounter.inc();
  }

  incrementEventBusPublished(): void {
    this.outboxEventsCreatedCounter.inc({
      topic: "redis_event_bus",
      event_type: "published",
    });
  }

  incrementEventBusProcessed(): void {
    this.kafkaEventsPublishedCounter.inc({ topic: "redis_event_bus_processed" });
  }

  incrementEventBusFailed(): void {
    this.consumerProcessingErrorsCounter.inc({
      consumer_group: "redis_event_bus_publish",
    });
  }

  setEventBusPendingCount(count: number): void {
    this.outboxPendingGauge.set(
      Math.max(0, Number.isFinite(count) ? count : 0),
    );
  }

  incrementEventBusRetried(): void {
    this.kafkaEventsConsumedCounter.inc({
      consumer_group: "redis_event_bus",
      topic: "redis_event_bus",
      event_type: "retried",
      status: "success",
    });
  }

  incrementEventBusDlq(): void {
    this.dlqEventsRoutedCounter.inc();
  }

  incrementEventBusFallbackDispatch(): void {
    this.kafkaEventsConsumedCounter.inc({
      consumer_group: "redis_event_bus",
      topic: "redis_event_bus",
      event_type: "fallback_dispatch",
      status: "success",
    });
  }

  incrementEventBusFallbackDispatchFailed(): void {
    this.consumerProcessingErrorsCounter.inc({
      consumer_group: "redis_event_bus_fallback",
    });
  }

  observeEventDispatchLag(topic: string, lagMs: number): void {
    this.eventDispatchLagHistogram.observe({ topic }, lagMs);
  }

  observeEventProcessingLag(
    consumerGroup: string,
    topic: string,
    eventType: string,
    lagMs: number,
  ): void {
    this.eventProcessingLagHistogram.observe(
      { consumer_group: consumerGroup, topic, event_type: eventType },
      lagMs,
    );
  }

  setOutboxPendingCount(count: number): void {
    this.outboxPendingGauge.set(
      Math.max(0, Number.isFinite(count) ? count : 0),
    );
  }

  setOutboxOldestUnpublishedAge(ageMs: number): void {
    this.outboxOldestUnpublishedAgeGauge.set(
      Math.max(0, Number.isFinite(ageMs) ? ageMs : 0),
    );
  }

  incrementOutboxDispatchFailure(): void {
    this.outboxDispatchFailuresCounter.inc();
  }

  incrementOutboxEventsCreated(topic: string, eventType: string): void {
    this.outboxEventsCreatedCounter.inc({ topic, event_type: eventType });
  }

  incrementOutboxPublished(eventType: string): void {
    this.outboxPublishedCounter.inc({ event_type: eventType });
  }

  incrementOutboxRetry(eventType: string): void {
    this.outboxRetryCounter.inc({ event_type: eventType });
  }

  incrementOutboxDeadLetter(eventType: string): void {
    this.outboxDeadLetterCounter.inc({ event_type: eventType });
  }

  incrementKafkaEventsPublished(topic: string): void {
    this.kafkaEventsPublishedCounter.inc({ topic });
  }

  incrementKafkaEventsConsumed(
    consumerGroup: string,
    topic: string,
    eventType: string,
    status: "success" | "skipped_idempotent",
  ): void {
    this.kafkaEventsConsumedCounter.inc({
      consumer_group: consumerGroup,
      topic,
      event_type: eventType,
      status,
    });
  }

  incrementConsumerProcessingError(consumerGroup: string): void {
    this.consumerProcessingErrorsCounter.inc({ consumer_group: consumerGroup });
  }

  incrementDlqEventsRouted(): void {
    this.dlqEventsRoutedCounter.inc();
  }

  incrementUploadSuccess(purpose: string): void {
    this.uploadSuccessCounter.inc({ purpose });
  }

  incrementUploadFailure(purpose: string, reason: string): void {
    this.uploadFailureCounter.inc({ purpose, reason });
  }

  observeUploadDuration(purpose: string, seconds: number): void {
    this.uploadDurationHistogram.observe({ purpose }, seconds);
  }

  incrementVirusScanResult(result: string): void {
    this.virusScanResultsCounter.inc({ result });
  }

  incrementImageProcessed(operation: string, status: string): void {
    this.imageProcessedCounter.inc({ operation, status });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  // ── Attendance metric helpers ────────────────────────────────────
  incrementAttendanceCheck(type: string, status: string, verification?: string): void {
    this.attendanceCheckCounter.inc({ type, status, verification: verification ?? "none" });
  }

  observeAttendanceCheckDuration(type: string, durationMs: number): void {
    this.attendanceCheckDuration.observe({ type }, durationMs);
  }

  observeAttendanceVerificationStep(step: string, status: string, durationMs: number): void {
    this.attendanceVerificationDuration.observe({ step, status }, durationMs);
  }

  observeAttendanceUploadDuration(uploadType: string, durationMs: number): void {
    this.attendanceUploadDuration.observe({ type: uploadType }, durationMs);
  }

  incrementAttendanceGeoFail(siteId?: string): void {
    this.attendanceGeoFailTotal.inc({ site_id: siteId ?? "unknown" });
  }

  incrementAttendanceIpFail(siteId?: string): void {
    this.attendanceIpFailTotal.inc({ site_id: siteId ?? "unknown" });
  }

  incrementAttendanceFaceFail(reason?: string): void {
    this.attendanceFaceFailTotal.inc({ reason: reason ?? "unknown" });
  }

  incrementAttendanceDuplicate(): void {
    this.attendanceDuplicateTotal.inc();
  }


}
