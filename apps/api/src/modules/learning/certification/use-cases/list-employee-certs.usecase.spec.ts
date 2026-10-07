import { ListEmployeeCertificatesUseCase } from "./list-employee-certs.usecase";

describe(ListEmployeeCertificatesUseCase.name, () => {
  it("returns certificates for a given employee", async () => {
    const repo = {
      findCertsByEmployee: jest.fn().mockResolvedValue([
        { id: "cert-1", definitionId: "def-1", employeeId: "emp-1", status: "active",
          certificateNumber: "CERT-001", issuedAt: new Date(), expiresAt: null },
      ]),
    };
    const useCase = new ListEmployeeCertificatesUseCase(repo as any);
    const result = await useCase.execute("emp-1");

    expect(result).toHaveLength(1);
    expect(result[0]!.certificateNumber).toBe("CERT-001");
  });

  it("returns empty list when employee has no certificates", async () => {
    const repo = { findCertsByEmployee: jest.fn().mockResolvedValue([]) };
    const useCase = new ListEmployeeCertificatesUseCase(repo as any);
    const result = await useCase.execute("emp-1");
    expect(result).toEqual([]);
  });
});
