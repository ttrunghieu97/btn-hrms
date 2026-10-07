/**
 * manage-task-delegations.usecase.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for department-scoped delegation creation guard (task 7.5).
 */

import { ManageTaskDelegationsUseCase } from "./manage-task-delegations.usecase";
import { ForbiddenException, BadRequestException, ConflictException } from "@nestjs/common";

function makeUseCase(hasCycle = false) {
  const repo = {
    create: jest.fn().mockResolvedValue({ id: "delegation-1" }),
    listActiveByDelegator: jest.fn().mockResolvedValue([]),
    hasActiveDelegationChain: jest.fn().mockResolvedValue(hasCycle),
  };

  const usecase = new ManageTaskDelegationsUseCase(repo as any, {} as any);
  return { usecase, repo };
}

describe("ManageTaskDelegationsUseCase", () => {
  it("rejects self-delegation", async () => {
    const { usecase } = makeUseCase();

    await expect(
      usecase.create("user-1", "user-1", { isSuperAdmin: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects delegation cycle (A delegates to B, B already delegates to A)", async () => {
    const { usecase } = makeUseCase(true);

    await expect(
      usecase.create("user-1", "user-2", { isSuperAdmin: true }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

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
