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
});
