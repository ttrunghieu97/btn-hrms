import { ResolveEmployeeAttachmentPlanService } from "./resolve-employee-attachment-plan.service";

describe(ResolveEmployeeAttachmentPlanService.name, () => {
  const service = new ResolveEmployeeAttachmentPlanService();

  it("builds attachment actions from employee payload intent (keep/remove only)", () => {
    const plan = service.execute({
      avatar: { mode: "keep", attachmentId: "att-avatar" },
      documents: [
        { documentType: "resume", mode: "keep", attachmentId: "att-resume" },
        { documentType: "jobApplication", mode: "remove", attachmentId: "att-job" },
      ],
      certifications: [
        {
          name: "AWS",
          issuedBy: "Amazon",
          issuedDate: "2026-01-01",
          evidence: { mode: "keep", attachmentId: "att-cert" },
        },
        {
          id: "cert-2",
          name: "Azure",
          issuedBy: "Microsoft",
          issuedDate: "2026-02-01",
          expiredDate: "2026-12-31",
          evidence: { mode: "keep", attachmentId: "att-cert-2" },
        },
      ],
    });

    expect(plan.avatar).toEqual({
      action: "keep",
      currentAttachmentId: "att-avatar",
    });
    expect(plan.documents).toEqual([
      { documentType: "resume", action: "keep", currentAttachmentId: "att-resume" },
      { documentType: "jobApplication", action: "remove", currentAttachmentId: "att-job" },
    ]);
    expect(plan.certifications).toEqual([
      {
        certificationId: undefined,
        action: "create",
        name: "AWS",
        issuedBy: "Amazon",
        issuedDate: "2026-01-01",
        expiredDate: undefined,
        evidenceAction: "keep",
        currentAttachmentId: "att-cert",
      },
      {
        certificationId: "cert-2",
        action: "update",
        name: "Azure",
        issuedBy: "Microsoft",
        issuedDate: "2026-02-01",
        expiredDate: "2026-12-31",
        evidenceAction: "keep",
        currentAttachmentId: "att-cert-2",
      },
    ]);
  });

  it("returns empty plan when upload fields absent", () => {
    expect(service.execute({})).toEqual({
      avatar: undefined,
      documents: undefined,
      certifications: undefined,
    });
  });

  it("maps avatar keep intent", () => {
    expect(
      service.execute({ avatar: { mode: "keep", attachmentId: "att-avatar" } }),
    ).toEqual({
      avatar: { action: "keep", currentAttachmentId: "att-avatar" },
      documents: undefined,
      certifications: undefined,
    });
  });

  it("maps avatar remove intent", () => {
    expect(
      service.execute({ avatar: { mode: "remove", attachmentId: "att-avatar" } }),
    ).toEqual({
      avatar: { action: "remove", currentAttachmentId: "att-avatar" },
      documents: undefined,
      certifications: undefined,
    });
  });
});
