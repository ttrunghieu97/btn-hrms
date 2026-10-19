import "reflect-metadata";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import * as dotenv from "dotenv";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../../infrastructure/database/schema";
import { RequestContextService } from "../../../shared/context/request-context.service";
import { PayrollRunsRepository } from "../../../modules/payroll/payroll-runs/repositories/payroll-runs.repository";
import {
  ApprovePayrollRunUseCase,
  GeneratePayrollRunUseCase,
  PostPayrollRunUseCase,
  RejectPayrollRunUseCase,
  RequestPayrollApprovalUseCase,
  resolveCurrentCycleApprovalHistory,
} from "../../../modules/payroll/payroll-runs/use-cases/payroll-runs.usecases";
import { PayrollRunStateMachine } from "../../../modules/payroll/payroll-runs/services/payroll-run-state-machine";
import { PayrollDecisionHandler } from "../../../integration/payroll-approval/payroll-decision.handler.service";
import { PayrollRepository } from "../../../modules/payroll/payroll/repositories/payroll.repository";
import { CalculateFinalSettlementUseCase } from "../../../modules/payroll/payroll/use-cases/calculate-final-settlement.usecase";
import { SettlementStatusWriterAdapter } from "../../../contracts/adapters/settlement-status-writer.adapter";

function resolveTestDbUrl(): string {
  const repoRoot = resolve(__dirname, "../../../../../..");
  const apiEnvPath = resolve(repoRoot, "apps/api/.env");
  const rootEnvPath = resolve(repoRoot, ".env");
  const parsedEnv = {
    ...(existsSync(rootEnvPath)
      ? dotenv.parse(readFileSync(rootEnvPath, "utf8"))
      : {}),
    ...(existsSync(apiEnvPath)
      ? dotenv.parse(readFileSync(apiEnvPath, "utf8"))
      : {}),
  };
  const dbUrl =
    process.env.DATABASE_DIRECT_URL ||
    process.env.DATABASE_URL ||
    parsedEnv.DATABASE_DIRECT_URL ||
    parsedEnv.DATABASE_URL;
  if (!dbUrl) {
    throw new Error(
      "DATABASE_URL is not configured for PostgreSQL integration test",
    );
  }
  return dbUrl;
}

describe("Phase 6G — Residual Payroll Findings Remediation Suite (P6F-001, P6F-002, P6F-003)", () => {
  const stateMachine = new PayrollRunStateMachine();

  describe("1. P0 — P6F-002: Approval History, SoD Provenance & Concurrent Approval Consistency", () => {
    it("resolves only the current approval cycle after a REJECTED entry and fails closed on malformed or stale history", () => {
      // 1. Empty history -> no requester
      const empty = resolveCurrentCycleApprovalHistory([]);
      expect(empty.isMalformed).toBe(false);
      expect(empty.requesterUserId).toBeNull();

      // 2. Prior rejected cycle with no new REQUESTED entry -> requesterUserId is null (never inherits User A!)
      const staleAfterReject = resolveCurrentCycleApprovalHistory([
        { action: "REQUESTED", performedByUserId: "user-a" },
        { action: "REJECTED", performedByUserId: "user-b" },
      ]);
      expect(staleAfterReject.isMalformed).toBe(false);
      expect(staleAfterReject.hasPriorRejectionWithoutNewRequest).toBe(true);
      expect(staleAfterReject.requesterUserId).toBeNull();
      expect(staleAfterReject.latestAction).toBe("REJECTED");

      // 3. New cycle after rejection -> resolves only Cycle 2's requester (User C)
      const cycle2 = resolveCurrentCycleApprovalHistory([
        { action: "REQUESTED", performedByUserId: "user-a" },
        { action: "REJECTED", performedByUserId: "user-b" },
        { action: "REQUESTED", performedByUserId: "user-c" },
      ]);
      expect(cycle2.isMalformed).toBe(false);
      expect(cycle2.requesterUserId).toBe("user-c");
      expect(cycle2.requesterUserIds).toEqual(["user-c"]);
      expect(cycle2.latestAction).toBe("REQUESTED");

      // 4. Malformed history: unknown action, APPROVED without REQUESTED, or 'system' requester
      expect(
        resolveCurrentCycleApprovalHistory([
          { action: "UNKNOWN_ACTION", performedByUserId: "user-a" },
        ]).isMalformed,
      ).toBe(true);

      expect(
        resolveCurrentCycleApprovalHistory([
          { action: "APPROVED", performedByUserId: "user-b" },
        ]).isMalformed,
      ).toBe(true);

      expect(
        resolveCurrentCycleApprovalHistory([
          { action: "REQUESTED", performedByUserId: "system" },
        ]).isMalformed,
      ).toBe(true);
    });

    it("does not insert a duplicate APPROVED history record when PayrollDecisionHandler conditional update affects 0 rows", async () => {
      const insertSpy = jest.fn();
      const txMock = {
        execute: jest
          .fn()
          .mockResolvedValue([{ id: "run-dup-1", status: "pending_approval" }]),
        query: {
          payrollRuns: {
            findFirst: jest.fn().mockResolvedValue({
              id: "run-dup-1",
              status: "pending_approval",
            }),
          },
          payrollRunApprovalHistory: {
            findMany: jest.fn().mockResolvedValue([
              { action: "REQUESTED", performedByUserId: "user-maker" },
            ]),
          },
          payslips: {
            findMany: jest.fn().mockResolvedValue([
              { id: "ps-1", metadata: { calculationStatus: "CONFIRMED" } },
            ]),
          },
        },
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              // Concurrent winner already transitioned the row -> 0 rows returned!
              returning: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
        insert: insertSpy,
      };

      const dbMock = {
        query: {
          approvalRequests: {
            findFirst: jest.fn().mockResolvedValue({
              id: "apr-dup-1",
              requestedByUserId: "user-maker",
              metadata: { payrollRunId: "run-dup-1" },
            }),
          },
          payrollRuns: txMock.query.payrollRuns,
          payrollRunApprovalHistory: txMock.query.payrollRunApprovalHistory,
          payslips: txMock.query.payslips,
        },
        transaction: jest.fn(async (fn) => fn(txMock)),
      };

      const handler = new PayrollDecisionHandler(
        dbMock as any,
        new RequestContextService(),
      );

      await handler.handleApproval({
        approvalRequestId: "apr-dup-1",
        decidedByUserId: "user-checker",
        decidedAt: new Date(),
      });

      expect(dbMock.transaction).toHaveBeenCalledTimes(1);
      expect(insertSpy).not.toHaveBeenCalled();
    });

    it("enforces in-transaction locked re-verification on ApprovePayrollRunUseCase and PostPayrollRunUseCase when state or history changes concurrently", async () => {
      // Pre-flight sees User A as requester, but inside tx after FOR UPDATE lock,
      // a rapid reject+regenerate made User B the current-cycle requester!
      let callCount = 0;
      const repo = {
        findById: jest.fn().mockResolvedValue({
          id: "run-race-sod",
          status: "pending_approval",
          calculationVersionId: "v1",
          calculationHash: "h1",
        }),
        lockRunById: jest.fn().mockResolvedValue({
          id: "run-race-sod",
          status: "pending_approval",
          approvedByUserId: null,
          postedByUserId: null,
          calculationVersionId: "v1",
          calculationHash: "h1",
        }),
        getApprovalHistory: jest.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            return [{ action: "REQUESTED", performedByUserId: "user-a" }];
          }
          // Inside tx after lock: Cycle 1 was rejected and Cycle 2 was requested by user-b!
          return [
            { action: "REQUESTED", performedByUserId: "user-a" },
            { action: "REJECTED", performedByUserId: "user-c" },
            { action: "REQUESTED", performedByUserId: "user-b" },
          ];
        }),
        findPayslipsByRunId: jest.fn().mockResolvedValue([
          { id: "ps-1", metadata: { calculationStatus: "CONFIRMED" } },
        ]),
        transaction: jest.fn(async (fn) => fn({})),
        updateStatusWithGuard: jest.fn(),
        recordApprovalAction: jest.fn(),
      };
      const outbox = { stage: jest.fn() };
      const approveUseCase = new ApprovePayrollRunUseCase(
        repo as any,
        stateMachine,
        outbox as any,
      );

      await expect(
        approveUseCase.execute("run-race-sod", "user-b"),
      ).rejects.toThrow(/Segregation of Duties/);
      expect(repo.lockRunById).toHaveBeenCalledTimes(1);
      expect(repo.updateStatusWithGuard).not.toHaveBeenCalled();
      expect(repo.recordApprovalAction).not.toHaveBeenCalled();
    });
  });

  describe("2. Live PostgreSQL Rolled-Back Integration Tests (P6F-001, P6F-002, P6F-003)", () => {
    it("verifies P6F-001 (regeneration after rejection & snapshot lineage), P6F-002 (multi-cycle SoD & concurrent duplicate approval idempotency), and P6F-003 (settlement failure state & retry) on live PostgreSQL", async () => {
      const dbUrl = resolveTestDbUrl();
      const sqlClient = postgres(dbUrl, { max: 2, connect_timeout: 5 });
      const db = drizzle(sqlClient, { schema });

      try {
        await expect(
          db.transaction(async (txDb) => {
            await txDb.execute(sql`SELECT pg_advisory_xact_lock(20260601)`);
            // Seed 3 distinct users: Alice, Bob, Charlie
            const [userAlice] = await txDb
              .insert(schema.users)
              .values({
                username: "p6g_alice",
                email: "p6g_alice@example.com",
                passwordHash: "hash",
              })
              .returning({ id: schema.users.id });
            const [userBob] = await txDb
              .insert(schema.users)
              .values({
                username: "p6g_bob",
                email: "p6g_bob@example.com",
                passwordHash: "hash",
              })
              .returning({ id: schema.users.id });
            const [userCharlie] = await txDb
              .insert(schema.users)
              .values({
                username: "p6g_charlie",
                email: "p6g_charlie@example.com",
                passwordHash: "hash",
              })
              .returning({ id: schema.users.id });

            const [emp] = await txDb
              .insert(schema.employees)
              .values({
                userId: userAlice!.id,
                firstName: "Phase6G",
                lastName: "Tester",
                employeeCode: "EMP-P6G-001",
                endDate: "2026-10-15",
              })
              .returning({ id: schema.employees.id });

            await txDb.insert(schema.salaryStructures).values({
              employeeId: emp!.id,
              baseSalary: "20000000",
              currency: "VND",
              effectiveFrom: "2026-01-01",
              isCurrent: true,
            });

            await txDb.insert(schema.payrollCalculationVersions).values({
              code: "v-p6g-active",
              name: "Phase 6G Calc Version",
              status: "active",
              effectiveFrom: "2026-01-01",
            });

            const [period] = await txDb
              .insert(schema.payrollPeriods)
              .values({
                code: "2026-10-P6G",
                name: "Oct 2026 P6G",
                startsOn: "2026-10-01",
                endsOn: "2026-10-31",
                status: "open",
              })
              .returning({ id: schema.payrollPeriods.id });

            const [run] = await txDb
              .insert(schema.payrollRuns)
              .values({
                payrollPeriodId: period!.id,
                status: "draft",
              })
              .returning({ id: schema.payrollRuns.id });

            const runRepo = new PayrollRunsRepository(txDb as any);
            jest
              .spyOn(runRepo, "getEmployeesForPayrollRun")
              .mockResolvedValue([{ id: emp!.id } as any]);

            const outbox = { stage: jest.fn().mockResolvedValue(undefined) };
            let simulatedWorkedMinutes = 9600;
            const generateUseCase = new GeneratePayrollRunUseCase(
              runRepo,
              {
                getEffectiveDailySummaries: jest
                  .fn()
                  .mockImplementation(async () => [
                    {
                      employeeId: emp!.id,
                      workedMinutes: simulatedWorkedMinutes,
                      overtimeMinutes: 120,
                    },
                  ]),
              },
              {
                evaluate: jest.fn().mockImplementation((s: any) => ({
                  payableMinutes: s.workedMinutes ?? 0,
                  payableOvertimeMinutes: s.overtimeMinutes ?? 0,
                  payableDayFraction: 1,
                  blockedReasons: [],
                  attendanceOutcome: "present",
                })),
              },
              { getAdjustmentDeltas: jest.fn().mockResolvedValue([]) },
              outbox as any,
              stateMachine,
            );
            const rejectUseCase = new RejectPayrollRunUseCase(
              runRepo,
              stateMachine,
              outbox as any,
            );
            const approveUseCase = new ApprovePayrollRunUseCase(
              runRepo,
              stateMachine,
              outbox as any,
            );
            const postUseCase = new PostPayrollRunUseCase(
              runRepo,
              stateMachine,
              outbox as any,
            );

            // =========================================================================
            // A. P6F-002 & P6F-001: Missing requester rejected; Cycle 1 generated by Alice
            // =========================================================================
            await expect(generateUseCase.execute(run!.id, null)).rejects.toThrow(
              "Approval requester identity is required to enforce Segregation of Duties",
            );
            await expect(
              generateUseCase.execute(run!.id, "system"),
            ).rejects.toThrow(
              "Approval requester identity is required to enforce Segregation of Duties",
            );

            // Cycle 1: Alice generates the payroll run
            const gen1 = await generateUseCase.execute(run!.id, userAlice!.id);
            expect(gen1.status).toBe("pending_approval");

            const snapshotsAfterGen1 =
              await runRepo.getRunInputSnapshotsWithItems(run!.id, txDb as any);
            expect(snapshotsAfterGen1).toHaveLength(1);
            expect(snapshotsAfterGen1[0]!.snapshot.generatedByUserId).toBe(
              userAlice!.id,
            );
            expect(
              (snapshotsAfterGen1[0]!.snapshot.sourceVersions as any)
                .attemptNumber,
            ).toBe(1);
            const attempt1SnapshotId = snapshotsAfterGen1[0]!.snapshot.id;

            // =========================================================================
            // B. P6F-001 & P6F-002: Bob rejects Cycle 1 -> returns to draft
            // =========================================================================
            const rejected1 = await rejectUseCase.execute(
              run!.id,
              userBob!.id,
              "Attendance correction needed",
            );
            expect(rejected1.status).toBe("draft");

            // Verify a stale REQUESTED entry from Cycle 1 cannot be used if someone forces status to pending_approval without a new REQUESTED entry
            await txDb
              .update(schema.payrollRuns)
              .set({ status: "pending_approval" })
              .where(eq(schema.payrollRuns.id, run!.id));

            await expect(
              approveUseCase.execute(run!.id, userCharlie!.id),
            ).rejects.toThrow(
              "Approval requester identity is required to enforce Segregation of Duties",
            );

            // Restore status back to draft for legitimate regeneration
            await txDb
              .update(schema.payrollRuns)
              .set({ status: "draft" })
              .where(eq(schema.payrollRuns.id, run!.id));

            // =========================================================================
            // C. P6F-001: Failed regeneration rolls back all writes, preserving Attempt 1 snapshot & payslip
            // =========================================================================
            await expect(
              txDb.transaction(async (failSavepoint) => {
                const failRepo = new PayrollRunsRepository(failSavepoint as any);
                jest
                  .spyOn(failRepo, "getEmployeesForPayrollRun")
                  .mockResolvedValue([{ id: emp!.id } as any]);
                jest
                  .spyOn(failRepo, "createPayrollItems")
                  .mockRejectedValueOnce(
                    new Error("SIMULATED_REGEN_ITEM_FAILURE"),
                  );
                const failingGen = new GeneratePayrollRunUseCase(
                  failRepo,
                  { getEffectiveDailySummaries: jest.fn().mockResolvedValue([]) },
                  {
                    evaluate: jest.fn().mockReturnValue({
                      payableMinutes: 0,
                      payableOvertimeMinutes: 0,
                      payableDayFraction: 1,
                      blockedReasons: [],
                      attendanceOutcome: "present",
                    }),
                  },
                  { getAdjustmentDeltas: jest.fn().mockResolvedValue([]) },
                  outbox as any,
                  stateMachine,
                );
                await failingGen.execute(run!.id, userBob!.id);
              }),
            ).rejects.toThrow("SIMULATED_REGEN_ITEM_FAILURE");

            const snapshotsAfterFailedRegen =
              await runRepo.getRunInputSnapshotsWithItems(run!.id, txDb as any);
            expect(snapshotsAfterFailedRegen).toHaveLength(1);
            expect(snapshotsAfterFailedRegen[0]!.snapshot.id).toBe(
              attempt1SnapshotId,
            );
            const runAfterFailedRegen = await runRepo.findById(run!.id);
            expect(runAfterFailedRegen?.status).toBe("draft");

            // =========================================================================
            // D. P6F-001 & P6F-002: Bob regenerates Cycle 2 -> succeeds without 23505 and preserves Attempt 1 in attemptHistory!
            // =========================================================================
            simulatedWorkedMinutes = 10080; // Updated attendance minutes in Attempt 2
            const gen2 = await generateUseCase.execute(run!.id, userBob!.id);
            expect(gen2.status).toBe("pending_approval");

            const snapshotsAfterGen2 =
              await runRepo.getRunInputSnapshotsWithItems(run!.id, txDb as any);
            expect(snapshotsAfterGen2).toHaveLength(1);
            const snap2 = snapshotsAfterGen2[0]!;
            expect(snap2.snapshot.generatedByUserId).toBe(userBob!.id);
            const sv2 = snap2.snapshot.sourceVersions as Record<string, any>;
            expect(sv2.attemptNumber).toBe(2);
            expect(sv2.attemptHistory).toHaveLength(1);
            expect(sv2.attemptHistory[0]).toEqual(
              expect.objectContaining({
                attemptNumber: 1,
                snapshotId: attempt1SnapshotId,
                generatedByUserId: userAlice!.id,
                items: expect.arrayContaining([
                  expect.objectContaining({
                    inputType: "ATTENDANCE_REGULAR_MINUTES",
                    value: 9600,
                  }),
                ]),
              }),
            );
            expect(snap2.items).toEqual(
              expect.arrayContaining([
                expect.objectContaining({
                  inputType: "ATTENDANCE_REGULAR_MINUTES",
                  value: 10080,
                }),
              ]),
            );

            // =========================================================================
            // E. P6F-002: In Cycle 2, Bob is now the requester -> Bob CANNOT approve Cycle 2,
            // while Alice (Cycle 1's rejected requester) or Charlie CAN approve Cycle 2!
            // =========================================================================
            await expect(
              approveUseCase.execute(run!.id, userBob!.id),
            ).rejects.toThrow(/Segregation of Duties/);

            // Confirm provisionalpayslips for approval test
            await txDb
              .update(schema.payslips)
              .set({
                metadata: { calculationStatus: "CONFIRMED", isProvisional: false },
              })
              .where(eq(schema.payslips.payrollRunId, run!.id));

            // Test PayrollDecisionHandler idempotency & duplicate event handling on live Postgres:
            const [approvalPolicy] = await txDb
              .insert(schema.approvalPolicies)
              .values({
                key: "p6g_payroll_policy",
                name: "P6G Payroll Approval Policy",
                steps: [{ stepOrder: 1, approverRole: "hr_admin" }],
              } as any)
              .returning({ id: schema.approvalPolicies.id });

            const [approvalReq] = await txDb
              .insert(schema.approvalRequests)
              .values({
                policyId: approvalPolicy!.id,
                subjectType: "payroll",
                subjectId: run!.id,
                requestedByUserId: userBob!.id,
                status: "approved",
                metadata: { payrollRunId: run!.id },
              } as any)
              .returning({ id: schema.approvalRequests.id });

            const decisionHandler = new PayrollDecisionHandler(
              txDb as any,
              new RequestContextService(),
            );

            // Bob (Cycle 2 requester) attempts to approve via approval engine -> refused!
            await decisionHandler.handleApproval({
              approvalRequestId: approvalReq!.id,
              decidedByUserId: userBob!.id,
              decidedAt: new Date(),
            });
            expect((await runRepo.findById(run!.id))?.status).toBe(
              "pending_approval",
            );

            // Alice (distinct from Cycle 2 requester Bob) approves via approval engine -> succeeds!
            await decisionHandler.handleApproval({
              approvalRequestId: approvalReq!.id,
              decidedByUserId: userAlice!.id,
              decidedAt: new Date(),
            });
            expect((await runRepo.findById(run!.id))?.status).toBe("approved");

            // Duplicate delivery of the exact same approval event -> no second APPROVED row inserted!
            const historyBeforeDup = await runRepo.getApprovalHistory(
              run!.id,
              txDb as any,
            );
            const approvedCountBeforeDup = historyBeforeDup.filter(
              (h) => h.action === "APPROVED",
            ).length;
            expect(approvedCountBeforeDup).toBe(1);

            await decisionHandler.handleApproval({
              approvalRequestId: approvalReq!.id,
              decidedByUserId: userAlice!.id,
              decidedAt: new Date(),
            });
            const historyAfterDup = await runRepo.getApprovalHistory(
              run!.id,
              txDb as any,
            );
            const approvedCountAfterDup = historyAfterDup.filter(
              (h) => h.action === "APPROVED",
            ).length;
            expect(approvedCountAfterDup).toBe(1);

            // Bob (Cycle 2 requester) attempts to post Cycle 2 -> blocked by SoD!
            await expect(
              postUseCase.execute(run!.id, userBob!.id),
            ).rejects.toThrow(/Segregation of Duties/);

            // Charlie posts Cycle 2 -> succeeds and locks input snapshots!
            const postedRun = await postUseCase.execute(
              run!.id,
              userCharlie!.id,
            );
            expect(postedRun.status).toBe("posted");

            const snapshotsAfterPost =
              await runRepo.getRunInputSnapshotsWithItems(run!.id, txDb as any);
            expect(snapshotsAfterPost[0]!.snapshot.status).toBe("locked");
            expect(snapshotsAfterPost[0]!.snapshot.lockedAt).not.toBeNull();

            // Verify deleteRunInputSnapshots cannot delete locked snapshots
            await runRepo.deleteRunInputSnapshots(run!.id, txDb as any);
            const snapshotsStillLocked =
              await runRepo.getRunInputSnapshotsWithItems(run!.id, txDb as any);
            expect(snapshotsStillLocked).toHaveLength(1);

            // =========================================================================
            // F. P6F-003: Final Settlement Failure State Persistence, Timeout Recovery & Retry on Live PostgreSQL
            // =========================================================================
            const [boardingProc] = await txDb
              .insert(schema.boardingProcesses)
              .values({
                employeeId: emp!.id,
                type: "offboarding",
                status: "completed",
                startDate: "2026-10-01",
                targetDate: "2026-10-15",
              } as any)
              .returning({ id: schema.boardingProcesses.id });

            await txDb.insert(schema.offboardingSettlementLinks).values({
              processId: boardingProc!.id,
              employeeId: emp!.id,
              status: "pending",
            });

            const settlementWriterAdapter = new SettlementStatusWriterAdapter(
              txDb as any,
            );
            const payrollRepo = new PayrollRepository(txDb as any);

            // Simulate mid-transaction failure on Attempt 1
            const makeItemSpy = jest
              .spyOn(payrollRepo as any, "makePayrollItem")
              .mockImplementationOnce(() => {
                throw new Error("SIMULATED_PG_SETTLEMENT_FAILURE");
              });

            const settlementUseCase = new CalculateFinalSettlementUseCase(
              payrollRepo,
              {
                findEmployeeById: jest.fn().mockResolvedValue({
                  id: emp!.id,
                  endDate: "2026-06-15",
                }),
              },
              settlementWriterAdapter,
              new RequestContextService(),
            );

            // Attempt 1 fails inside nested savepoint -> DB writes roll back AND settlement link transitions to 'failed'!
            await expect(
              settlementUseCase.execute({
                processId: boardingProc!.id,
                employeeId: emp!.id,
              }),
            ).rejects.toThrow("SIMULATED_PG_SETTLEMENT_FAILURE");

            const [linkAfterFail] = await txDb
              .select()
              .from(schema.offboardingSettlementLinks)
              .where(
                eq(
                  schema.offboardingSettlementLinks.processId,
                  boardingProc!.id,
                ),
              );
            expect(linkAfterFail?.status).toBe("failed");
            expect(linkAfterFail?.payrollRef).toBeNull();

            // Verify stale 'processing' timeout recovery helper on PostgreSQL
            const staleTime = new Date(Date.now() - 30 * 60 * 1000);
            await txDb
              .update(schema.offboardingSettlementLinks)
              .set({ status: "processing", updatedAt: staleTime })
              .where(
                eq(
                  schema.offboardingSettlementLinks.processId,
                  boardingProc!.id,
                ),
              );

            const recoveredProcessIds =
              await settlementWriterAdapter.recoverStaleProcessing(
                15 * 60 * 1000,
              );
            expect(recoveredProcessIds).toContain(boardingProc!.id);

            const [linkAfterRecovery] = await txDb
              .select()
              .from(schema.offboardingSettlementLinks)
              .where(
                eq(
                  schema.offboardingSettlementLinks.processId,
                  boardingProc!.id,
                ),
              );
            expect(linkAfterRecovery?.status).toBe("failed");

            // Attempt 2 (retry) succeeds -> transitions to 'settled' with payrollRef!
            makeItemSpy.mockRestore();
            const retryResult = await settlementUseCase.execute({
              processId: boardingProc!.id,
              employeeId: emp!.id,
            });
            expect(retryResult.status).toBe("settled");
            expect(retryResult.payrollRef).toBeDefined();

            const [linkAfterRetry] = await txDb
              .select()
              .from(schema.offboardingSettlementLinks)
              .where(
                eq(
                  schema.offboardingSettlementLinks.processId,
                  boardingProc!.id,
                ),
              );
            expect(linkAfterRetry?.status).toBe("settled");
            expect(linkAfterRetry?.payrollRef).toBe(retryResult.payrollRef);

            // Verify idempotency: late markFailed or markProcessing cannot clobber a 'settled' link
            await settlementWriterAdapter.markFailed(boardingProc!.id);
            await settlementWriterAdapter.markProcessing(boardingProc!.id);
            const [linkStillSettled] = await txDb
              .select()
              .from(schema.offboardingSettlementLinks)
              .where(
                eq(
                  schema.offboardingSettlementLinks.processId,
                  boardingProc!.id,
                ),
              );
            expect(linkStillSettled?.status).toBe("settled");
            expect(linkStillSettled?.payrollRef).toBe(retryResult.payrollRef);

            throw new Error("ROLLBACK_PHASE6G_INTENTIONAL");
          }),
        ).rejects.toThrow("ROLLBACK_PHASE6G_INTENTIONAL");
      } finally {
        await sqlClient.end();
      }
    });
  });
});
