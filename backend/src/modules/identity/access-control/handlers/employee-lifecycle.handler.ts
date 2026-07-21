import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import type { AppDatabase } from "../../../../infrastructure/database/database-client.type";
import { EVENT_BUS_TOKEN as EVENT_BUS, IEventBus as EventBus } from "../../../../core/events/event-bus.interface";
import { EmployeeTerminatedEvent } from "../../../../core/events/events/employee-terminated.event";
import { EmployeeRehiredEvent } from "../../../../core/events/events/employee-rehired.event";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { CONTRACTS_TOKENS } from "../../../../contracts/contracts.tokens";
import { type AuditLogPort } from "../../../../contracts/ports/audit-log.port";
import { type IdentityAdminPort } from "../../../../contracts/ports/identity-admin.port";
import { EMPLOYEE_READER_PORT, IEmployeeReader } from "../../../../contracts/ports/employee-reader.port";
import { EventIdempotencyRepository } from "../../../../infrastructure/repositories/event-idempotency.repository";

@Injectable()
export class EmployeeIdentityLifecycleHandler implements OnModuleInit {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    @Inject(DATABASE_CONNECTION) private readonly db: AppDatabase,
    @Inject(CONTRACTS_TOKENS.IDENTITY_ADMIN_PORT)
    private readonly identityAdmin: IdentityAdminPort,
    private readonly requestContext: RequestContextService,
    @Inject(CONTRACTS_TOKENS.AUDIT_LOG_PORT)
    private readonly auditLog: AuditLogPort,
    private readonly idempotency: EventIdempotencyRepository,
  ) {
    this.logger = new ContextLogger(requestContext, EmployeeIdentityLifecycleHandler.name);
  }

  async onModuleInit() {
    // ─── Employee Terminated → deactivate user ─────────────────────
    this.eventBus.on(
      EmployeeTerminatedEvent.eventType,
      async (event: EmployeeTerminatedEvent) => {
        const eventId = event.eventId;
        const consumerId = "identity:employee_terminated";
        if (await this.idempotency.isProcessed(consumerId, eventId)) return;

        try {
          const employee = await this.db.query.employees.findFirst({
            where: (t: any, { eq }: any) => eq(t.id, event.data.employeeId),
            columns: { userId: true },
          });

          if (!employee?.userId) {
            this.logger.warn(`Employee ${event.data.employeeId} has no user to deactivate`);
            return;
          }

          await this.db.transaction(async (tx) => {
            await this.identityAdmin.revokeSessions(employee.userId, tx);
            await this.identityAdmin.deactivateUser(employee.userId, tx);
            await this.idempotency.markProcessed(consumerId, eventId, tx);
          });
          await this.auditLog.write({
            action: "identity_user_disabled",
            entity: "user",
            entityId: employee.userId,
            metadata: { employeeId: event.data.employeeId, reason: "employee_terminated" },
          });
          this.logger.log(`Deactivated user ${employee.userId} for terminated employee ${event.data.employeeId}`);
        } catch (err) {
          this.logger.error({ event: "identity_deactivate_failed", employeeId: event.data.employeeId, error: String(err) });
        }
      },
    );

    // ─── Employee Rehired → reactivate user ────────────────────────
    this.eventBus.on(
      EmployeeRehiredEvent.eventType,
      async (event: EmployeeRehiredEvent) => {
        const eventId = event.eventId;
        const consumerId = "identity:employee_rehired";
        if (await this.idempotency.isProcessed(consumerId, eventId)) return;

        try {
          const employee = await this.db.query.employees.findFirst({
            where: (t: any, { eq }: any) => eq(t.id, event.data.employeeId),
            columns: { userId: true },
          });

          if (!employee?.userId) {
            this.logger.warn(`Employee ${event.data.employeeId} has no user to reactivate`);
            return;
          }

          await this.db.transaction(async (tx) => {
            await this.identityAdmin.reactivateUser(employee.userId, tx);
            await this.idempotency.markProcessed(consumerId, eventId, tx);
          });
          this.logger.log(`Reactivated user ${employee.userId} for rehired employee ${event.data.employeeId}`);
        } catch (err) {
          this.logger.error({ event: "identity_reactivate_failed", employeeId: event.data.employeeId, error: String(err) });
        }
      },
    );
  }
}
