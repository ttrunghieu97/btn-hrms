import { EmployeeDataPipe } from "./employee-data.pipe";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";

describe(EmployeeDataPipe.name, () => {
  const pipe = new EmployeeDataPipe();

  it("normalizes empty email to null", async () => {
    const out = await pipe.transform(
      {
        firstName: "A",
        lastName: "B",
        employeeCode: "EMP001",
        email: "",
        documents: JSON.stringify([]),
      },
      { type: "body", metatype: CreateEmployeeDto } as any,
    );

    expect(out.email).toBeNull();
  });

  it("parses canonical attachment intent payload (keep/remove only)", async () => {
    const out = await pipe.transform(
      {
        firstName: "A",
        lastName: "B",
        employeeCode: "EMP001",
        avatar: JSON.stringify({ mode: "keep", attachmentId: "att-avatar" }),
        documents: JSON.stringify([
          { documentType: "resume", mode: "keep", attachmentId: "att-resume" },
          { documentType: "jobApplication", mode: "remove", attachmentId: "att-job" },
        ]),
        certifications: JSON.stringify([
          {
            name: "AWS",
            issuedBy: "Amazon",
            issuedDate: "2026-01-01",
            evidence: { mode: "remove" },
          },
          {
            name: "Azure",
            issuedBy: "Microsoft",
            issuedDate: "2026-02-01",
            evidence: { mode: "keep", attachmentId: "att-cert" },
          },
        ]),
      },
      { type: "body", metatype: CreateEmployeeDto } as any,
    );

    expect(out.avatar).toEqual({ mode: "keep", attachmentId: "att-avatar" });
    expect(out.documents).toEqual([
      { documentType: "resume", mode: "keep", attachmentId: "att-resume" },
      { documentType: "jobApplication", mode: "remove", attachmentId: "att-job" },
    ]);
    expect(out.certifications?.[0]?.evidence).toEqual({ mode: "remove" });
    expect(out.certifications?.[1]?.evidence).toEqual({ mode: "keep", attachmentId: "att-cert" });
  });

  it("keeps update email clearing behavior", async () => {
    const out = await pipe.transform(
      {
        email: "",
        documents: JSON.stringify([]),
      },
      { type: "body", metatype: UpdateEmployeeDto } as any,
    );

    expect(out.email).toBeNull();
  });

  it("drops nullish date transport values before DTO validation", async () => {
    const out = await pipe.transform(
      {
        firstName: "A",
        lastName: "B",
        employeeCode: "EMP001",
        dob: "null",
        startDate: "",
        identityDate: "undefined",
        documents: JSON.stringify([]),
      },
      { type: "body", metatype: CreateEmployeeDto } as any,
    );

    expect(out.dob).toBeUndefined();
    expect(out.startDate).toBeUndefined();
    expect(out.identityDate).toBeUndefined();
  });

  it("rejects gender values outside the persistence enum", async () => {
    await expect(
      pipe.transform(
        {
          firstName: "A",
          lastName: "B",
          employeeCode: "EMP001",
          gender: "undisclosed",
        },
        { type: "body", metatype: CreateEmployeeDto } as any,
      ),
    ).rejects.toThrow("gender must be one of the following values");
  });

  it("throws validation error when documents is invalid JSON", async () => {
    await expect(
      pipe.transform(
        {
          firstName: "A",
          lastName: "B",
          documents: "{invalid-json}",
        },
        { type: "body", metatype: CreateEmployeeDto } as any,
      ),
    ).rejects.toThrow("documents must be valid JSON");
  });

  it("throws validation error when certifications is invalid JSON", async () => {
    await expect(
      pipe.transform(
        {
          firstName: "A",
          lastName: "B",
          certifications: "{invalid-json}",
        },
        { type: "body", metatype: CreateEmployeeDto } as any,
      ),
    ).rejects.toThrow("certifications must be valid JSON");
  });

  it("rejects non-array documents payload", async () => {
    await expect(
      pipe.transform(
        {
          firstName: "A",
          lastName: "B",
          documents: JSON.stringify({ resume: { mode: "replace", tempFileToken: "tmp-1" } }),
        },
        { type: "body", metatype: CreateEmployeeDto } as any,
      ),
    ).rejects.toThrow("documents must be a JSON array");
  });

  it("rejects legacy avatarAttachmentId bridge", async () => {
    await expect(
      pipe.transform(
        {
          firstName: "A",
          lastName: "B",
          avatarAttachmentId: "att-legacy",
          documents: JSON.stringify([]),
        },
        { type: "body", metatype: CreateEmployeeDto } as any,
      ),
    ).rejects.toThrow("avatarAttachmentId must use the canonical attachment intent contract");
  });

  it("rejects legacy fileToken in documents", async () => {
    await expect(
      pipe.transform(
        {
          firstName: "A",
          lastName: "B",
          documents: JSON.stringify([
            { documentType: "resume", mode: "replace", fileToken: "legacy-token" },
          ]),
        },
        { type: "body", metatype: CreateEmployeeDto } as any,
      ),
    ).rejects.toThrow("documents.0.fileToken must use tempFileToken");
  });

  it("rejects attachment intent with both attachmentId and tempFileToken", async () => {
    await expect(
      pipe.transform(
        {
          firstName: "A",
          lastName: "B",
          documents: JSON.stringify([
            {
              documentType: "resume",
              mode: "replace",
              attachmentId: "att-1",
              tempFileToken: "tmp-1",
            },
          ]),
        },
        { type: "body", metatype: CreateEmployeeDto } as any,
      ),
    ).rejects.toThrow("cannot include both attachmentId and tempFileToken");
  });
});
