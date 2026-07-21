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
});
