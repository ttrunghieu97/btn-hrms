import { IssueCertificateUseCase } from "./issue-certificate.usecase";

describe(IssueCertificateUseCase.name, () => {
  const now = Date.now();

  it("issues a certificate with generated number", async () => {
    const repo = {
      findDefById: jest.fn().mockResolvedValue({ id: "def-1", status: "active", validityMonths: null }),
      insertCert: jest.fn().mockResolvedValue({
        id: "cert-1", definitionId: "def-1", employeeId: "emp-1",
        certificateNumber: `CERT-${now}-abc12345`, status: "active",
        issuedAt: new Date(), expiresAt: null,
      }),
    };
    const eventOutbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) };
    const useCase = new IssueCertificateUseCase(repo as any, eventOutbox as any);
    const result = await useCase.execute({ definitionId: "def-1", employeeId: "emp-1" }, "admin-1");

    expect(result.status).toBe("active");
    expect(result.certificateNumber).toContain("CERT-");
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "learning.certificate.issued.v1" }),
    );
  });

  it("rejects issue for inactive definition", async () => {
    const repo = {
      findDefById: jest.fn().mockResolvedValue({ id: "def-1", status: "archived" }),
    };
    const useCase = new IssueCertificateUseCase(repo as any, {} as any);
    await expect(
      useCase.execute({ definitionId: "def-1", employeeId: "emp-1" }, "admin-1"),
    ).rejects.toThrow("Definition is not active");
  });

  it("rejects issue for non-existent definition", async () => {
    const repo = { findDefById: jest.fn().mockResolvedValue(null) };
    const useCase = new IssueCertificateUseCase(repo as any, {} as any);
    await expect(
      useCase.execute({ definitionId: "def-1", employeeId: "emp-1" }, "admin-1"),
    ).rejects.toThrow("Certification definition not found");
  });
});
