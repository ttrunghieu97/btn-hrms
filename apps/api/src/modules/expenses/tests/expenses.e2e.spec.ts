import { Test } from "@nestjs/testing";
import { CreateClaimUseCase } from "../claim/use-cases/create-claim.usecase";
import { AddItemUseCase } from "../claim/use-cases/add-item.usecase";
import { SubmitClaimUseCase } from "../claim/use-cases/submit-claim.usecase";
import { ApproveClaimUseCase } from "../claim/use-cases/approve-claim.usecase";
import { ReimburseClaimUseCase } from "../claim/use-cases/reimburse-claim.usecase";
import { ExpenseClaimRepository } from "../claim/repositories/expense-claim.repository";
import { EventOutboxService } from "../../../core/events/event-outbox.service";
import { ExpenseClaimSubmittedEvent } from "../../../core/events/events/expense-claim-submitted.event";
import { ExpenseClaimApprovedEvent } from "../../../core/events/events/expense-claim-approved.event";
import { ExpenseClaimReimbursedEvent } from "../../../core/events/events/expense-claim-reimbursed.event";

describe("Expenses Integration Acceptance (Journey 8)", () => {
  let createClaim: CreateClaimUseCase;
  let addItem: AddItemUseCase;
  let submitClaim: SubmitClaimUseCase;
  let approveClaim: ApproveClaimUseCase;
  let reimburseClaim: ReimburseClaimUseCase;

  let claimsStore: Map<string, any>;
  let itemsStore: Map<string, any[]>;
  let stagedEvents: any[];

  beforeEach(async () => {
    claimsStore = new Map();
    itemsStore = new Map();
    stagedEvents = [];

    const mockClaimRepo = {
      insert: jest.fn(async (data: any) => {
        const id = `claim-${claimsStore.size + 1}`;
        const row = { id, totalAmount: "0.00", ...data };
        claimsStore.set(id, row);
        itemsStore.set(id, []);
        return row;
      }),
      findById: jest.fn(async (id: string) => claimsStore.get(id) ?? null),
      addItem: jest.fn(async (item: any) => {
        const list = itemsStore.get(item.claimId) ?? [];
        const created = { id: `item-${list.length + 1}`, ...item };
        list.push(created);
        itemsStore.set(item.claimId, list);
        return created;
      }),
      findItems: jest.fn(async (claimId: string) => itemsStore.get(claimId) ?? []),
      update: jest.fn(async (id: string, patch: any) => {
        const existing = claimsStore.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...patch };
        claimsStore.set(id, updated);
        return updated;
      }),
      transaction: jest.fn(async (fn: any) => fn({})),
    };

    const mockOutbox = {
      stage: jest.fn(async (event: any) => {
        stagedEvents.push(event);
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateClaimUseCase,
        AddItemUseCase,
        SubmitClaimUseCase,
        ApproveClaimUseCase,
        ReimburseClaimUseCase,
        { provide: ExpenseClaimRepository, useValue: mockClaimRepo },
        { provide: EventOutboxService, useValue: mockOutbox },
      ],
    }).compile();

    createClaim = moduleRef.get(CreateClaimUseCase);
    addItem = moduleRef.get(AddItemUseCase);
    submitClaim = moduleRef.get(SubmitClaimUseCase);
    approveClaim = moduleRef.get(ApproveClaimUseCase);
    reimburseClaim = moduleRef.get(ReimburseClaimUseCase);
  });

  it("executes full lifecycle: draft claim → blocks empty submission → adds items → submits → blocks self-approval → approves → reimburses and stages events", async () => {
    const claim = await createClaim.execute("emp-claimant", {
      title: "Q2 Client Onsite Travel",
      description: "Flight and hotel expenses",
      currency: "VND",
    });
    expect(claim.status).toBe("draft");

    // Submitting a claim with 0 items must fail
    await expect(submitClaim.execute(claim.id)).rejects.toThrow(
      "Claim must have at least one item",
    );

    // Add two expense items
    await addItem.execute({
      claimId: claim.id,
      description: "Round-trip airfare",
      amount: 3200000,
      expenseDate: "2026-04-10",
      receiptRequired: true,
    });
    await addItem.execute({
      claimId: claim.id,
      description: "Hotel accommodation (2 nights)",
      amount: 1800000,
      expenseDate: "2026-04-12",
      receiptRequired: true,
    });

    // Submit claim
    await submitClaim.execute(claim.id);
    expect(claimsStore.get(claim.id).status).toBe("submitted");
    expect(claimsStore.get(claim.id).totalAmount).toBe("5000000.00");
    expect(stagedEvents).toHaveLength(1);
    expect(stagedEvents[0]).toBeInstanceOf(ExpenseClaimSubmittedEvent);

    // Adding items after submission must fail
    await expect(
      addItem.execute({
        claimId: claim.id,
        description: "Late taxi receipt",
        amount: 200000,
        expenseDate: "2026-04-12",
      }),
    ).rejects.toThrow("Can only add items to draft claims");

    // Self-approval by the claimant must be rejected with 403 Forbidden
    await expect(
      approveClaim.execute(claim.id, "user-claimant", "emp-claimant"),
    ).rejects.toThrow("Approver cannot approve their own expense claim");
    expect(claimsStore.get(claim.id).status).toBe("submitted");

    // Reimbursing before approval must fail
    await expect(reimburseClaim.execute(claim.id)).rejects.toThrow(
      "Only approved claims can be reimbursed",
    );

    // Manager approves claim
    await approveClaim.execute(claim.id, "user-manager", "emp-manager");
    expect(claimsStore.get(claim.id).status).toBe("approved");
    expect(stagedEvents).toHaveLength(2);
    expect(stagedEvents[1]).toBeInstanceOf(ExpenseClaimApprovedEvent);

    // Finance reimburses claim
    await reimburseClaim.execute(claim.id);
    expect(claimsStore.get(claim.id).status).toBe("reimbursed");
    expect(stagedEvents).toHaveLength(3);
    expect(stagedEvents[2]).toBeInstanceOf(ExpenseClaimReimbursedEvent);
    expect(stagedEvents[2].data).toMatchObject({
      claimId: claim.id,
      employeeId: "emp-claimant",
      totalAmount: "5000000.00",
    });
  });
});
