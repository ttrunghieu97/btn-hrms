import { EmployeeMapper } from "./employee.mapper";

describe("EmployeeMapper", () => {
  it("maps canonical attachments and department correctly", () => {
    const now = new Date();

    const dto = EmployeeMapper.toResponseDto({
      id: "emp-1",
      firstName: "Jane",
      lastName: "Doe",
      employeeCode: "BTN-999",
      avatar: null,
      avatarFile: {
        id: "file-avatar-1",
        key: "employees/emp-1/avatar.png",
        mimeType: "image/png",
        sizeBytes: 1024,
      },
      dob: null,
      gender: null,
      address: null,
      phoneNumber: null,
      position: null,
      startDate: null,
      endDate: null,
      status: null,
      identityNumber: null,
      identityDate: null,
      identityPlace: null,
      createdAt: now,
      updatedAt: now,
      orgAssignments: [
        {
          id: "oa-1",
          jobTitle: null,
          department: { id: "dep-1", name: "Engineering" },
          isCurrent: true,
        },
      ],
      documents: [
        {
          id: "doc-1",
          documentType: "resume",
          attachmentId: "file-doc-1",
          isActive: true,
          createdAt: now,
          file: {
            id: "file-doc-1",
            key: "employees/emp-1/resume.pdf",
            mimeType: "application/pdf",
            sizeBytes: 2048,
          },
        },
      ],
      certifications: [
        {
          id: "cert-1",
          name: "AWS",
          issuedBy: "Amazon",
          issuedDate: "2026-01-01",
          expiredDate: null,
          attachmentId: "file-cert-1",
          file: {
            id: "file-cert-1",
            key: "employees/emp-1/cert.png",
            mimeType: "image/png",
            sizeBytes: 512,
          },
        },
      ],
      user: { id: "u-1", username: "jane.doe", email: "jane@btn.local" },
    } as any);

    expect(dto).toEqual({
      id: "emp-1",
      username: "jane.doe",
      email: "jane@btn.local",
      bankAccountNumber: null,
      bankName: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      taxCode: null,
      firstName: "Jane",
      lastName: "Doe",
      employeeCode: "BTN-999",
      avatar: {
        attachmentId: "file-avatar-1",
        url: "/files/employees/emp-1/avatar.png",
        key: "employees/emp-1/avatar.png",
        mimeType: "image/png",
        sizeBytes: 1024,
      },
      dob: null,
      gender: null,
      address: null,
      phoneNumber: null,
      position: null,
      startDate: null,
      endDate: null,
      lastWorkingDate: null,
      status: null,
      contractType: null,
      contractStatus: null,
      contractEffectiveFrom: null,
      contractEffectiveTo: null,
      identityNumber: null,
      identityDate: null,
      identityPlace: null,
      department: { id: "dep-1", name: "Engineering" },
      documents: [
        {
          id: "doc-1",
          documentType: "resume",
          attachment: {
            attachmentId: "file-doc-1",
            url: "/files/employees/emp-1/resume.pdf",
            key: "employees/emp-1/resume.pdf",
            mimeType: "application/pdf",
            sizeBytes: 2048,
          },
          createdAt: now,
        },
      ],
      jobAssignments: [],
      certifications: [
        {
          id: "cert-1",
          name: "AWS",
          issuedBy: "Amazon",
          issuedDate: "2026-01-01",
          expiredDate: null,
          attachment: {
            attachmentId: "file-cert-1",
            url: "/files/employees/emp-1/cert.png",
            key: "employees/emp-1/cert.png",
            mimeType: "image/png",
            sizeBytes: 512,
          },
        },
      ],
      allowedTransitions: [],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  });

  it.each([
    ["probation", ["working", "terminated"]],
    ["working", ["leave", "suspended", "retired", "terminated"]],
    ["leave", ["working", "terminated"]],
    ["suspended", ["working", "terminated"]],
    ["retired", []],
    ["terminated", []],
  ] as const)("maps status '%s' to canonical allowedTransitions %j", (status, expectedTransitions) => {
    const dto = EmployeeMapper.toResponseDto({
      id: "emp-status",
      firstName: "Test",
      lastName: "User",
      employeeCode: "EMP-S",
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    expect(dto?.status).toBe(status);
    expect(dto?.allowedTransitions).toEqual(expectedTransitions);
  });

  it("redacts sensitive fields when sensitiveFieldsAllowed is false and exposes them when true", () => {
    const rawRow = {
      id: "emp-sens",
      firstName: "Sens",
      lastName: "User",
      employeeCode: "EMP-SENS",
      status: "working",
      identityNumber: "012345678901",
      identityDate: "2020-01-01",
      identityPlace: "Hanoi",
      bankAccountNumber: "999888777",
      bankName: "VCB",
      taxCode: "TAX-123",
      emergencyContactName: "Contact",
      emergencyContactPhone: "0909000111",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    const redacted = EmployeeMapper.toResponseDtoWithPosition(rawRow, null, false);
    expect(redacted.identityNumber).toBe("••••••••8901");
    expect(redacted.identityDate).toBeNull();
    expect(redacted.identityPlace).toBeNull();
    expect(redacted.bankAccountNumber).toBe("••••••••8777");
    expect(redacted.bankName).toBeNull();
    expect(redacted.taxCode).toBe("••••••••-123");
    expect(redacted.emergencyContactName).toBeNull();
    expect(redacted.emergencyContactPhone).toBeNull();

    const exposed = EmployeeMapper.toResponseDtoWithPosition(rawRow, null, true);
    expect(exposed.identityNumber).toBe("012345678901");
    expect(exposed.bankAccountNumber).toBe("999888777");
    expect(exposed.taxCode).toBe("TAX-123");
    expect(exposed.emergencyContactPhone).toBe("0909000111");
  });
});
