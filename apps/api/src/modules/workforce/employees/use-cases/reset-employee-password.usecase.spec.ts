jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
}));

import * as bcrypt from "bcrypt";
import { ResetEmployeePasswordUseCase } from "./reset-employee-password.usecase";

describe(ResetEmployeePasswordUseCase.name, () => {
  it("resets password without returning plaintext", async () => {
    const tx = { name: "tx" };
    const employeesRepo = {
      findEmployeeUserContextByIdentifier: jest.fn().mockResolvedValue({
        userId: "u1",
        username: "alice",
      }),
      transaction: jest.fn().mockImplementation(async (fn) => fn(tx)),
      updateUserById: jest.fn().mockResolvedValue(undefined),
    };

    const configService = { get: jest.fn().mockReturnValue("Btn123@") };
    const useCase = new ResetEmployeePasswordUseCase(
      employeesRepo as any,
      { get: jest.fn().mockReturnValue({}) } as any,
      configService as any,
      { write: jest.fn() },
    );

    const result = await useCase.execute("e1") as any;

    expect(result).toEqual({
      success: true,
      username: "alice",
      password: null,
      temporaryPasswordIssued: false,
      resetRequired: true,
    });
    expect(bcrypt.hash).toHaveBeenCalledWith("Btn123@", 10);
    expect(employeesRepo.updateUserById).toHaveBeenCalledWith(
      "u1",
      {
        passwordHash: "hashed-password",
        mustChangePassword: true,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      },
      tx,
    );
  });
});
