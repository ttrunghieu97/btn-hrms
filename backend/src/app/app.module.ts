import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
  Logger,
} from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { redisStore } from "cache-manager-ioredis-yet";
import { AppController } from "./app.controller";
import { GetReadinessUseCase } from "./use-cases/get-readiness.usecase";
import { GetStrictReadinessUseCase } from "./use-cases/get-strict-readiness.usecase";
import { DatabaseModule } from "../infrastructure/database/database.module";
import { IdempotencyModule } from "../infrastructure/idempotency/idempotency.module";
import { SecurityModule } from "../infrastructure/security/security.module";
import { JwtAuthGuard } from "../core/security/guards/jwt-auth.guard";
import { AuthorizationGuard } from "../core/security/guards/authorization.guard";
import { UserOrIpThrottlerGuard } from "../core/security/guards/user-or-ip-throttler.guard";
import rateLimitConfig from "../config/rate-limit.config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AuditLogInterceptor } from "../shared/interceptors/audit-log.interceptor";
import { RequestLoggingInterceptor } from "../shared/interceptors/request-logging.interceptor";
import { TransformInterceptor } from "../shared/interceptors/transform.interceptor";
import { RequestContextInterceptor } from "../shared/interceptors/request-context.interceptor";
import { EventsModule } from "../core/events/events.module";
import { RequestIdMiddleware } from "../shared/middleware/request-id.middleware";
import { RequestContextMiddleware } from "../shared/context/request-context.middleware";
import { AllExceptionsFilter } from "../shared/filters/all-exceptions.filter";
import { RequestContextModule } from "../shared/context/request-context.module";
import { validateEnv } from "../shared/config/validate-env";
import { MetricsModule } from "../shared/metrics/metrics.module";
import { MetricsInterceptor } from "../shared/metrics/metrics.interceptor";
import { StorageModule as InfrastructureStorageModule } from "../infrastructure/storage/storage.module";
import { StorageDomainModule } from "../modules/storage/storage.module";
import { RedisModule } from "../infrastructure/redis/redis.module";
import { QueueModule } from "../infrastructure/queue/queue.module";
import { ContractsModule } from "../contracts";
import { KafkaModule } from "../modules/tasks/events/kafka/kafka.module";

import { IdentityDomainModule } from "../modules/identity/identity.module";
import { WorkforceDomainModule } from "../modules/workforce/workforce.module";
import { OrganizationDomainModule } from "../modules/organization/organization.module";
import { LeaveDomainModule } from "../modules/leave/leave.module";
import { RecruitmentDomainModule } from "../modules/recruitment/recruitment.module";
import { BoardingModule } from "../modules/onboarding/boarding.module";
import { OnboardingModule } from "../modules/onboarding/onboarding.module";
import { OffboardingModule } from "../modules/offboarding/offboarding.module";
import { LeaveApprovalIntegrationModule } from "../integration/leave-approval/leave-approval-integration.module";
import { RecruitmentApprovalIntegrationModule } from "../integration/recruitment-approval/recruitment-approval-integration.module";
import { PayrollApprovalIntegrationModule } from "../integration/payroll-approval/payroll-approval-integration.module";
import { AssetManagementModule } from "../modules/asset-management/asset-management.module";
import { AssetApprovalIntegrationModule } from "../integration/asset-approval/asset-approval-integration.module";
import { SchedulingDomainModule } from "../modules/scheduling/scheduling.module";
import { AttendanceDomainModule } from "../modules/attendance/attendance.module";
import { ReconciliationModule } from "../modules/reconciliation/reconciliation.module";
import { PayrollDomainModule } from "../modules/payroll/payroll-domain.module";

import { TasksDomainModule } from "../modules/tasks/tasks-domain.module";
import { AnalyticsDomainModule } from "../modules/analytics/analytics.module";
import { PlatformNavigationModule } from "../modules/platform-navigation/platform-navigation.module";

import { PlatformNotificationsDomainModule } from "../modules/platform-notifications/platform-notifications.module";
import { PlatformWorkflowEngineDomainModule } from "../modules/platform-workflow-engine/platform-workflow-engine.module";
import { PlatformApprovalEngineDomainModule } from "../modules/platform-approval-engine/platform-approval-engine.module";
import { IntegrationHubDomainModule } from "../modules/integration-hub/integration-hub.module";
import { ChatDomainModule } from "../modules/chat/chat.module";
import { PerformanceDomainModule } from "../modules/performance/performance.module";
import { BenefitsDomainModule } from "../modules/benefits/benefits.module";
import { ExpensesDomainModule } from "../modules/expenses/expenses.module";
import { LearningDomainModule } from "../modules/learning/learning.module";
import { MonitoringDomainModule } from "../infrastructure/monitoring/monitoring.module";
import { RateLimitModule } from "../modules/rate-limit/rate-limit.module";

import * as fs from "node:fs";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: [
        ".env",
        ".env.example",
        "../../.env",
        "../../.env.example",
      ].filter((f) => fs.existsSync(f)),
      load: [rateLimitConfig],
    }),
    KafkaModule.forRootAsync(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ([{
        name: "default",
        ttl: 60_000,
        limit: 300,
      }]),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const ttl = Number(config.get("PERMISSIONS_CACHE_TTL") || 300);
        const max = Number(config.get("PERMISSIONS_CACHE_MAX") || 1000);
        const redisUrl = String(config.get("REDIS_URL") || "").trim();

        if (redisUrl) {
          try {
            const store = await redisStore({
              url: redisUrl,
              lazyConnect: true,
              enableReadyCheck: false,
              connectTimeout: 3_000,
              maxRetriesPerRequest: 1,
              enableOfflineQueue: false,
              retryStrategy: (times: number) =>
                times > 3 ? null : Math.min(times * 200, 1_000),
            });
            // lazyConnect: ioredis connects on first .get()/.set() call.
            // No blocking, no retry storm at boot.
            return { store, ttl };
          } catch (err) {
            const logger = new Logger("CacheModule");
            logger.warn(
              `Redis cache unavailable, falling back to in-memory: ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          }
        }

        return { ttl, max };
      },
    }),
    DatabaseModule,
    IdempotencyModule,
    SecurityModule,
    RequestContextModule,
    MetricsModule,
    InfrastructureStorageModule,
    StorageDomainModule,
    ContractsModule,
    EventsModule,
    RedisModule,
    QueueModule,
    IdentityDomainModule,
    OrganizationDomainModule,
    LeaveDomainModule,
    RecruitmentDomainModule,
    SchedulingDomainModule,
    WorkforceDomainModule,
    BoardingModule,
    OnboardingModule,
    OffboardingModule,
    AttendanceDomainModule,
    ReconciliationModule,
    PayrollDomainModule,

    TasksDomainModule,
    AnalyticsDomainModule,
    PlatformNotificationsDomainModule,
    PlatformNavigationModule,
    PlatformWorkflowEngineDomainModule,
    PlatformApprovalEngineDomainModule,
    IntegrationHubDomainModule,
    LeaveApprovalIntegrationModule,
    PayrollApprovalIntegrationModule,
    RecruitmentApprovalIntegrationModule,
    AssetManagementModule,
    AssetApprovalIntegrationModule,
    ChatDomainModule,
    MonitoringDomainModule,
    RateLimitModule,
    PerformanceDomainModule,
    BenefitsDomainModule,
    ExpensesDomainModule,
    LearningDomainModule,
  ],
  controllers: [AppController],
  providers: [
    AllExceptionsFilter,
    RequestContextMiddleware,
    // Throttle fires first — before auth so unauthenticated brute-force is rate-limited
    { provide: APP_GUARD, useClass: UserOrIpThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // ↓ AuthorizationGuard replaces the old PoliciesGuard
    { provide: APP_GUARD, useClass: AuthorizationGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    GetReadinessUseCase,
    GetStrictReadinessUseCase,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes({ path: "{*path}", method: RequestMethod.ALL });

    consumer
      .apply(RequestContextMiddleware)
      .exclude(
        { path: "health", method: RequestMethod.ALL },
        { path: "ready", method: RequestMethod.ALL },
        { path: "ready/strict", method: RequestMethod.ALL },
        { path: "metrics", method: RequestMethod.ALL },
        { path: "auth/login", method: RequestMethod.ALL },
        { path: "auth/refresh", method: RequestMethod.ALL },
        { path: "auth/logout", method: RequestMethod.ALL },
        { path: "files/*path", method: RequestMethod.ALL },
      )
      .forRoutes({ path: "{*path}", method: RequestMethod.ALL });
  }
}
