import { Test } from "@nestjs/testing";
import { CreatePlanUseCase } from "../plan/use-cases/create-plan.usecase";
import { PublishPlanUseCase } from "../plan/use-cases/publish-plan.usecase";
import { EnrollEmployeeUseCase } from "../enrollment/use-cases/enroll-employee.usecase";
import { ApproveEnrollmentUseCase } from "../enrollment/use-cases/approve-enrollment.usecase";
import { ListEnrollmentsUseCase } from "../enrollment/use-cases/list-enrollments.usecase";
import { BenefitPlanRepository } from "../plan/repositories/benefit-plan.repository";
import { BenefitEnrollmentRepository } from "../enrollment/repositories/benefit-enrollment.repository";
import { EventOutboxService } from "../../../core/events/event-outbox.service";
import { BenefitEnrollmentApprovedEvent } from "../../../core/events/events/benefit-enrollment-approved.event";

describe("Benefits Integration Acceptance (Journey 9)", () => {
  let createPlan: CreatePlanUseCase;
  let publishPlan: PublishPlanUseCase;
  let enrollEmployee: EnrollEmployeeUseCase;
  let approveEnrollment: ApproveEnrollmentUseCase;
  let listEnrollments: ListEnrollmentsUseCase;

  let plansStore: Map<string, any>;
  let enrollmentsStore: Map<string, any>;
  let stagedEvents: any[];

  beforeEach(async () => {
    plansStore = new Map();
    enrollmentsStore = new Map();
    stagedEvents = [];

    const mockPlanRepo = {
      insert: jest.fn(async (data: any) => {
        const id = `plan-${plansStore.size + 1}`;
        const row = { id, ...data, createdAt: new Date() };
        plansStore.set(id, row);
        return row;
      }),
      findById: jest.fn(async (id: string) => plansStore.get(id) ?? null),
      update: jest.fn(async (id: string, patch: any) => {
        const existing = plansStore.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...patch };
        plansStore.set(id, updated);
        return updated;
      }),
    };

    const mockEnrollRepo = {
      insert: jest.fn(async (data: any) => {
        const id = `enroll-${enrollmentsStore.size + 1}`;
        const row = { id, ...data, createdAt: new Date("2026-04-01T08:00:00.000Z") };
        enrollmentsStore.set(id, row);
        return row;
      }),
      findById: jest.fn(async (id: string) => enrollmentsStore.get(id) ?? null),
      update: jest.fn(async (id: string, patch: any) => {
        const existing = enrollmentsStore.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...patch };
        enrollmentsStore.set(id, updated);
        return updated;
      }),
      findByEmployee: jest.fn(async (employeeId: string) =>
        Array.from(enrollmentsStore.values()).filter((e) => e.employeeId === employeeId),
      ),
      findAll: jest.fn(async () => Array.from(enrollmentsStore.values())),
    };

    const mockOutbox = {
      stage: jest.fn(async (event: any) => {
        stagedEvents.push(event);
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreatePlanUseCase,
        PublishPlanUseCase,
        EnrollEmployeeUseCase,
        ApproveEnrollmentUseCase,
        ListEnrollmentsUseCase,
        { provide: BenefitPlanRepository, useValue: mockPlanRepo },
        { provide: BenefitEnrollmentRepository, useValue: mockEnrollRepo },
        { provide: EventOutboxService, useValue: mockOutbox },
      ],
    }).compile();

    createPlan = moduleRef.get(CreatePlanUseCase);
    publishPlan = moduleRef.get(PublishPlanUseCase);
    enrollEmployee = moduleRef.get(EnrollEmployeeUseCase);
    approveEnrollment = moduleRef.get(ApproveEnrollmentUseCase);
    listEnrollments = moduleRef.get(ListEnrollmentsUseCase);
  });

  it("executes full lifecycle: plan created (draft) → blocks un-published enrollment → published → employee enrolled (pending) → approved (active) → BenefitEnrollmentApprovedEvent staged and visible in list", async () => {
    const plan = await createPlan.execute({
      name: "Comprehensive Health Care 2026",
      coverageType: "employee_and_family",
      employerContribution: 2500000,
      employeeContribution: 500000,
      effectiveFrom: "2026-05-01",
    });
    expect(plan.status).toBe("draft");

    // Enrolling in a draft plan must be rejected
    await expect(
      enrollEmployee.execute({
        planId: plan.id,
        employeeId: "emp-101",
        coverageType: "employee_and_family",
      }),
    ).rejects.toThrow("Plan must be published");

    // Publish plan
    await publishPlan.execute(plan.id);
    expect(plansStore.get(plan.id).status).toBe("published");

    // Re-publishing a published plan must be rejected
    await expect(publishPlan.execute(plan.id)).rejects.toThrow(
      "Only draft plans can be published",
    );

    // Enroll employee
    const enrollment = await enrollEmployee.execute({
      planId: plan.id,
      employeeId: "emp-101",
      coverageType: "employee_and_family",
      effectiveFrom: "2026-05-01",
    });
    expect(enrollment.status).toBe("pending");

    // Approve enrollment
    await approveEnrollment.execute(enrollment.id, "hr-approver-1");
    expect(enrollmentsStore.get(enrollment.id).status).toBe("active");
    expect(stagedEvents).toHaveLength(1);
    expect(stagedEvents[0]).toBeInstanceOf(BenefitEnrollmentApprovedEvent);
    expect(stagedEvents[0].data).toMatchObject({
      enrollmentId: enrollment.id,
      planId: plan.id,
      employeeId: "emp-101",
      approvedByUserId: "hr-approver-1",
    });

    // Re-approving an already active enrollment must be rejected
    await expect(approveEnrollment.execute(enrollment.id, "hr-approver-1")).rejects.toThrow(
      "Only pending enrollments can be approved",
    );

    // Verify status and date visibility in ListEnrollmentsUseCase
    const visible = await listEnrollments.execute("emp-101");
    expect(visible).toHaveLength(1);
    expect(visible[0]).toMatchObject({
      id: enrollment.id,
      planId: plan.id,
      employeeId: "emp-101",
      status: "active",
      coverageType: "employee_and_family",
      effectiveFrom: "2026-05-01",
      enrolledAt: "2026-04-01T08:00:00.000Z",
    });
  });
});
