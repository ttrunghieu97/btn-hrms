/**
 * transition-validator.delegation.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for department-scoped delegation behavior (task 7.5).
 */

import { TransitionValidator } from "../../platform-workflow-engine/tasks/transition-validator";
import { ForbiddenException } from "@nestjs/common";

function makeValidator(overrides?: {
  creatorDelegation?: any | null;
  departmentDelegation?: any | null;
}) {
  const repo = {
    findCreatorScopedDelegation: jest
      .fn()
      .mockResolvedValue(overrides?.creatorDelegation ?? null),
    findDepartmentScopedDelegation: jest
      .fn()
      .mockResolvedValue(overrides?.departmentDelegation ?? null),
    getMaxRevisionCountForPriority: jest.fn().mockResolvedValue(null),
  };

  const validator = new TransitionValidator(repo as any);
  return { validator, repo };
}

describe("TransitionValidator – delegation scope", () => {
  it("allows department-scoped delegate to approve in-scope task", async () => {
    const { validator } = makeValidator({
      creatorDelegation: null,
      departmentDelegation: {
        id: "delegation-1",
        delegatorUserId: "user-admin",
        delegateeUserId: "user-delegate",
        departmentId: "dept-1",
        isActive: true,
      },
    });

    const result = await validator.validate({
      task: {
        id: "task-1",
        status: "submitted",
        assigneeId: "emp-1",
        createdByUserId: "user-creator",
        assignee: { departmentId: "dept-1" },
        revisionCount: 0,
        priority: "high",
      },
      actor: {
        id: "user-delegate",
        username: "delegate",
        departmentId: null,
        permissions: [],
        roles: ["manager"],
        isSuperAdmin: false,
      },
      transition: "approve",
    });

    expect(result.targetStatus).toBe("completed");
    expect(result.isDelegated).toBe(true);
    expect(result.delegatorUserId).toBe("user-admin");
    expect(result.delegationScope).toBe("department");
  });

  it("rejects department-scoped delegate for out-of-scope task", async () => {
    const { validator } = makeValidator({
      creatorDelegation: null,
      departmentDelegation: null,
    });

    await expect(
      validator.validate({
        task: {
          id: "task-2",
          status: "submitted",
          assigneeId: "emp-2",
          createdByUserId: "user-creator",
          assignee: { departmentId: "dept-2" },
          revisionCount: 0,
          priority: "high",
        },
        actor: {
          id: "user-delegate",
          username: "delegate",
          departmentId: null,
          permissions: [],
          roles: ["manager"],
          isSuperAdmin: false,
        },
        transition: "approve",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
