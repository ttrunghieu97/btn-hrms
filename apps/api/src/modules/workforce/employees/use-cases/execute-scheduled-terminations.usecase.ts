import { Injectable } from "@nestjs/common";
import { todayDateString } from "../../../../shared/utils/date-format";
import { EmployeesRepository } from "../repositories/employees.repository";
import { EventOutboxService } from "../../../../core/events/event-outbox.service";
import { EmployeeTerminatedEvent } from "../../../../core/events/events/employee-terminated.event";
import { EmployeeTerminationExecutedEvent } from "../../../../core/events/events/employee-termination-executed.event";
import { PlatformWorkflowEngineService } from "../../../platform-workflow-engine/platform-workflow-engine.service";
import { EmployeeContractsRepository } from "../../employee-contracts/repositories/employee-contracts.repository";
import { EmployeeLifecycleService } from "../services/employee-lifecycle.service";
import { throwNotFound } from "../../../../shared/utils/http-error";
import { ERROR_CODES } from "../../../../shared/constants/error-codes";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import { CONTRACTS_TOKENS } from "../../../../contracts/contracts.tokens";
import { Inject } from "@nestjs/common";
import { type IdentityAdminPort } from "../../../../contracts/ports/identity-admin.port";

@Injectable()
export class ExecuteScheduledTerminationsUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly employeesRepo: EmployeesRepository,
    private readonly contractRepo: EmployeeContractsRepository,
    private readonly lifecycle: EmployeeLifecycleService,
    private readonly eventOutbox: EventOutboxService,
    private readonly requestContext: RequestContextService,
    private readonly workflowEngine: PlatformWorkflowEngineService,
    @Inject(CONTRACTS_TOKENS.IDENTITY_ADMIN_PORT)
    private readonly identityAdmin: IdentityAdminPort,
  ) {
    this.logger = new ContextLogger(requestContext, ExecuteScheduledTerminationsUseCase.name);
  }

  async processAllDue(batchSize = 50) {
    const definition = await this.workflowEngine.getActiveDefinition("employee_termination");
    if (!definition) {
      this.logger.warn({ event: "termination_worker.definition_not_found" });
      return { processed: 0 };
    }

    const today = todayDateString();
    const instances = await this.workflowEngine.findDueScheduledInstances(
      definition.id,
      today,
      batchSize,
    );

    let processed = 0;

    for (const instance of instances) {
      const metadata = (instance.metadata ?? {}) as Record<string, unknown>;
      const employeeId = instance.subjectId;
      const effectiveDate = (metadata.effectiveDate as string) ?? today;
      const reason = (metadata.reason as string) ?? "Scheduled termination";
      const lastWorkingDate = (metadata.lastWorkingDate as string | null) ?? null;

      try {
        const emp = await this.employeesRepo.findByIdentifier(employeeId);
        if (!emp || emp.status === "terminated" || emp.deletedAt) {
          await this.workflowEngine.updateInstance(instance.id, {
            status: "cancelled",
            completedAt: new Date(),
          });
          await this.workflowEngine.recordTransition({
            instanceId: instance.id,
            fromState: instance.currentState,
            toState: "cancelled",
            transition: "cancel",
            actorUserId: null,
            payload: { reason: "Employee already terminated or deleted" },
          });
          continue;
        }

        const userId = emp.userId as string | undefined;

        await this.employeesRepo.transaction(async (tx) => {
          await this.lifecycle.executeImmediateTermination(
            employeeId,
            { reason, effectiveDate, lastWorkingDate: lastWorkingDate ?? undefined },
            null,
            tx,
          );

          const activeContract = await this.contractRepo.getCurrent(employeeId, tx);
          if (activeContract) {
            await this.contractRepo.update(
              activeContract.id,
              {
                isCurrent: false,
                status: "terminated",
                effectiveTo: effectiveDate,
              },
              tx,
            );
          }

          if (userId) {
            await this.identityAdmin.deactivateUser(userId, tx);
          }

          await this.workflowEngine.updateInstance(instance.id, {
            currentState: "executed",
            status: "completed",
            completedAt: new Date(),
          });
          await this.workflowEngine.recordTransition({
            instanceId: instance.id,
            fromState: instance.currentState,
            toState: "executed",
            transition: "execute",
            actorUserId: null,
            payload: { executedAt: new Date().toISOString() },
          });

          await this.eventOutbox.stage(
            new EmployeeTerminatedEvent({
              employeeId,
              terminatedByUserId: null,
              effectiveDate,
              reason,
            }),
            tx,
          );
          await this.eventOutbox.stage(
            new EmployeeTerminationExecutedEvent({
              employeeId,
              effectiveDate,
              reason,
              lastWorkingDate,
              workflowInstanceId: instance.id,
            }),
            tx,
          );
        });

        processed++;
      } catch (err) {
        this.logger.error({
          event: "termination_worker.execute_failed",
          employeeId,
          workflowInstanceId: instance.id,
          error: String(err),
        });
      }
    }

    return { processed };
  }
}
