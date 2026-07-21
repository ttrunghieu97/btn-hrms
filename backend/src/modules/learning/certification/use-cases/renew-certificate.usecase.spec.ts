import { RenewCertificateUseCase } from "./renew-certificate.usecase";

describe(RenewCertificateUseCase.name, () => {
  it("renews an expired certificate", async () => {
    const repo = {
      findCertById: jest.fn().mockResolvedValue({
        id: "cert-1", definitionId: "def-1", employeeId: "emp-1", status: "expired",
      }),
      findDefById: jest.fn().mockResolvedValue({ id: "def-1", validityMonths: 12 }),
      updateCert: jest.fn().mockResolvedValue({}),
    };
    const eventOutbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) };
    const useCase = new RenewCertificateUseCase(repo as any, eventOutbox as any);
    await useCase.execute("cert-1");

    expect(repo.updateCert).toHaveBeenCalledWith("cert-1", {
      status: "active", expiresAt: expect.any(Date), revokedAt: null,
    });
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "learning.certificate.renewed.v1" }),
    );
  });

  it("rejects renew of non-existent certificate", async () => {
    const repo = { findCertById: jest.fn().mockResolvedValue(null) };
    const useCase = new RenewCertificateUseCase(repo as any, {} as any);
    await expect(useCase.execute("cert-1")).rejects.toThrow("Certificate not found");
  });
});
