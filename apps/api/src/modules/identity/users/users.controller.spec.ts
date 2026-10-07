import { UsersController } from "./users.controller";
import { CHECK_POLICY_KEY } from "../../../core/security/decorators/check-policy.decorator";
import { UserPolicies } from "../../../core/security/policies/user.policy";

describe("UsersController", () => {
  it("getMe returns user with permissions", async () => {
    const listUsers: any = { execute: jest.fn() };

    const controller = new UsersController(listUsers, { execute: jest.fn().mockResolvedValue({ id: "u1", username: "hieutt", permissions: ["employees:view"] }) } as any, { execute: jest.fn() } as any);

    const res = await controller.getMe({ user: { id: "u1" } } as any);
    expect(res).toEqual({
      id: "u1",
      username: "hieutt",
      permissions: ["employees:view"],
    });
    
  });

  it("getMe is explicitly protected by the self-view policy", () => {
    const metadata = Reflect.getMetadata(
      CHECK_POLICY_KEY,
      UsersController.prototype.getMe,
    );

    expect(metadata).toEqual([UserPolicies.viewSelf]);
  });
});
