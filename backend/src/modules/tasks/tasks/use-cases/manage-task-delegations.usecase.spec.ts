/**
 * manage-task-delegations.usecase.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for department-scoped delegation creation guard (task 7.5).
 */

import { ManageTaskDelegationsUseCase } from "./manage-task-delegations.usecase";
import { ForbiddenException } from "@nestjs/common";

function makeUseCase() {
  const db = {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: "delegation-1" }]),
    }),
    query: {
      taskDelegations: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    },
  };

  const usecase = new ManageTaskDelegationsUseCase(db as any, {} as any);
  return { usecase, db };
}

describe("ManageTaskDelegationsUseCase", () => {
  it("rejects department-scoped delegation creation by non-admin", async () => {
    const { usecase } = makeUseCase();

    await expect(
      usecase.create(
        "user-1",
        "user-2",
        { isSuperAdmin: false, permissions: [] },
        undefined,
        undefined,
        "dept-1",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
