import { RevokeCertificateUseCase } from "./revoke-certificate.usecase";

describe(RevokeCertificateUseCase.name, () => {
  it("revokes an active certificate", async () => {
    const repo = {
      findCertById: jest.fn().mockResolvedValue({
        id: "cert-1", definitionId: "def-1", employeeId: "emp-1", status: "active",
      }),
      updateCert: jest.fn().mockResolvedValue({}),
    };
    const eventOutbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) };
    const useCase = new RevokeCertificateUseCase(repo as any, eventOutbox as any);
    await useCase.execute("cert-1", "admin-1");

    expect(repo.updateCert).toHaveBeenCalledWith("cert-1", {
      status: "revoked", revokedAt: expect.any(Date),
    });
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "learning.certificate.revoked.v1" }),
    );
  });

  it("rejects revoke of already revoked certificate", async () => {
    const repo = {
      findCertById: jest.fn().mockResolvedValue({ id: "cert-1", status: "revoked" }),
    };
    const useCase = new RevokeCertificateUseCase(repo as any, {} as any);
    await expect(useCase.execute("cert-1", "admin-1")).rejects.toThrow("Only active certificates can be revoked");
  });
});
