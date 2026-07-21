import { Test } from "@nestjs/testing";
import { TransactionRunner } from "./transaction-runner";
import { DATABASE_CONNECTION } from "./database.provider";

describe("TransactionRunner", () => {
  const mockTx = Symbol("tx");
  // db.transaction(cb) calls cb(tx) and returns its result
  const mockDb = {
    transaction: jest.fn(async (cb: any) => cb(mockTx)),
  };

  let runner: TransactionRunner;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        TransactionRunner,
        { provide: DATABASE_CONNECTION, useValue: mockDb },
      ],
    }).compile();
    runner = mod.get(TransactionRunner);
    mockDb.transaction.mockClear();
  });

  it("injectable when DATABASE_CONNECTION provided", () => {
    expect(runner).toBeDefined();
  });

  it("delegates to db.transaction()", async () => {
    const cb = jest.fn();
    await runner.run(cb);
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(mockTx);
  });

  it("returns callback result", async () => {
    const result = await runner.run(async () => "done");
    expect(result).toBe("done");
  });

  it("propagates errors", async () => {
    await expect(
      runner.run(async () => { throw new Error("business error"); }),
    ).rejects.toThrow("business error");
  });
});
