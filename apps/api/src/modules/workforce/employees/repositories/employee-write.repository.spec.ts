import { EmployeeWriteRepository } from "./employee-write.repository";

describe("EmployeeWriteRepository audit", () => {
  let repo: EmployeeWriteRepository;
  let db: any;
  let lastInsertedAudit: Record<string, any> | null;

  beforeEach(() => {
    lastInsertedAudit = null;
    db = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve([{ identityNumber: "old-id", bankAccountNumber: "old-bank", version: 1 }])),
          })),
        })),
      })),
      update: jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(() => ({
            returning: jest.fn(() => Promise.resolve([{ id: "e1", identityNumber: "encrypted-new-id", version: 2 }])),
          })),
        })),
      })),
      execute: jest.fn((_: any) => {
        lastInsertedAudit = { recorded: true };
        return Promise.resolve();
      }),
      insert: jest.fn(() => ({ values: jest.fn(() => ({ returning: jest.fn(() => [{}]) })) })),
    };
    const encryption = {
      encryptPiiFields: jest.fn((row: any) => row),
    } as any;
    repo = new EmployeeWriteRepository(db, encryption);
  });

  it("writes audit entry when sensitive field changes", async () => {
    await repo.update("e1", { identityNumber: "new-id", expectedVersion: 1 });
    expect(lastInsertedAudit).toBeTruthy();
  });

  it("does not write audit entry when sensitive field unchanged", async () => {
    db.select = jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve([{ identityNumber: null, bankAccountNumber: null, version: 1 }])),
        })),
      })),
    }));
    await repo.update("e1", { firstName: "John" });
    expect(lastInsertedAudit).toBeNull();
  });

  it("throws conflict on stale version and writes no audit", async () => {
    db.update = jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          returning: jest.fn(() => Promise.resolve([])),
        })),
      })),
    }));
    await expect(repo.update("e1", { identityNumber: "new-id", expectedVersion: 99 })).rejects.toThrow("conflict");
    expect(lastInsertedAudit).toBeNull();
  });

  it("persists encrypted PII ciphertext in both create() and update()", async () => {
    let insertedValues: any = null;
    let updatedValues: any = null;
    db.insert = jest.fn(() => ({
      values: jest.fn((v: any) => {
        insertedValues = v;
        return { returning: jest.fn(() => Promise.resolve([{ id: "e1", ...v }])) };
      }),
    }));
    db.update = jest.fn(() => ({
      set: jest.fn((v: any) => {
        updatedValues = v;
        return {
          where: jest.fn(() => ({
            returning: jest.fn(() => Promise.resolve([{ id: "e1", ...v, version: 2 }])),
          })),
        };
      }),
    }));
    const realLikeEncryption = {
      encryptPiiFields: jest.fn((row: any) => ({
        ...row,
        ...(row.identityNumber ? { identityNumber: `v1:enc(${row.identityNumber})` } : {}),
        ...(row.bankAccountNumber ? { bankAccountNumber: `v1:enc(${row.bankAccountNumber})` } : {}),
      })),
    } as any;
    const encryptedRepo = new EmployeeWriteRepository(db, realLikeEncryption);

    await encryptedRepo.create({
      userId: "u1",
      firstName: "An",
      lastName: "Nguyen",
      employeeCode: "EMP-01",
      identityNumber: "012345678901",
      bankAccountNumber: "999888777",
    } as any);
    expect(insertedValues.identityNumber).toBe("v1:enc(012345678901)");
    expect(insertedValues.bankAccountNumber).toBe("v1:enc(999888777)");

    await encryptedRepo.update("e1", {
      identityNumber: "099988877766",
      expectedVersion: 1,
    });
    expect(updatedValues.identityNumber).toBe("v1:enc(099988877766)");
    expect(updatedValues.expectedVersion).toBeUndefined();
  });
});
