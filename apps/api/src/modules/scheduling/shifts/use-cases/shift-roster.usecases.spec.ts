import { RosterExpansionService } from "../schedule-roster/services/roster-expansion.service";
import { type ShiftRosterLifecycleService } from "../schedule-roster/services/shift-roster-lifecycle.service";
import { ApproveShiftRosterUseCase, QueryShiftRosterUseCase } from "../schedule-roster/use-cases/roster/shift-roster.usecases";
import { type EventOutboxService } from "../../../../core/events/event-outbox.service";

describe("QueryShiftRosterUseCase", () => {
  it("expands assignment rows and includes publication state", async () => {
    const repo: any = {
      listRosterRows: jest.fn().mockResolvedValue([
        {
          id: "as-1",
          employeeId: "emp-1",
          effectiveFrom: "2026-04-14",
          effectiveTo: "2026-04-15",
          status: "planned",
          employee: {
            firstName: "Jane",
            lastName: "Doe",
            departmentId: "dep-1",
          },
          shiftTemplateId: "tpl-1",
          shiftTemplate: {
            code: "DAY",
            name: "Day Shift",
            startTime: "09:00:00",
            endTime: "17:00:00",
            breakMinutes: 60,
            isNightShift: false,
            workDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
          },
        },
      ]),
      findRosterPublication: jest.fn().mockResolvedValue({
        publishedAt: new Date("2026-04-13T08:00:00.000Z"),
      }),
    };

    const useCase = new QueryShiftRosterUseCase(
      repo,
      new RosterExpansionService(),
    );
    const result = await useCase.execute({
      from: "2026-04-14",
      to: "2026-04-15",
    });

    expect(result.publication.isPublished).toBe(false);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows[0]).toMatchObject({
      employeeId: "emp-1",
      shiftTemplateCode: "DAY",
    });
  });
});

describe("ApproveShiftRosterUseCase", () => {
  it("transitions roster publication inside a repository transaction", async () => {
    const tx = { tx: true };
    const publication = {
      id: "pub-1",
      branchId: null,
      departmentId: null,
      periodStart: "2026-04-01",
      periodEnd: "2026-04-30",
      status: "pending_approval",
      version: 1,
    };
    const updated = { ...publication, status: "approved" };
    const repo: any = {
      transaction: jest.fn().mockImplementation(async (fn) => fn(tx)),
      ensureRosterPublication: jest.fn().mockResolvedValue(publication),
      upsertRosterPublication: jest.fn().mockResolvedValue(updated),
      createRosterLifecycleHistory: jest.fn().mockResolvedValue({ id: "hist-1" }),
      listRosterRows: jest.fn().mockResolvedValue([]),
      createRosterVersionSnapshot: jest.fn().mockResolvedValue({ id: "snap-1" }),
    };
    const lifecycle = {
      buildTransitionPayload: jest.fn().mockReturnValue({ status: "approved" }),
    } as unknown as ShiftRosterLifecycleService;
    const eventOutbox = { stage: jest.fn().mockResolvedValue(undefined) } as unknown as EventOutboxService;
    const useCase = new ApproveShiftRosterUseCase(repo, lifecycle, eventOutbox);

    await useCase.execute({
      from: "2026-04-01",
      to: "2026-04-30",
      approvedByUserId: "user-1",
    });

    expect(repo.transaction).toHaveBeenCalled();
    expect(repo.ensureRosterPublication).toHaveBeenCalledWith(
      expect.objectContaining({ from: "2026-04-01", to: "2026-04-30" }),
      tx,
    );
    expect(repo.upsertRosterPublication).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved" }),
      tx,
    );
    expect(repo.createRosterLifecycleHistory).toHaveBeenCalledWith(
      expect.objectContaining({ toStatus: "approved" }),
      tx,
    );
  });
});
