import { BadRequestException } from "@nestjs/common";
import { CheckUsernameUseCase } from "./check-username.usecase";

describe("CheckUsernameUseCase", () => {
  const repo = {
    userExistsByUsername: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("throws for empty username", async () => {
    const usecase = new CheckUsernameUseCase(repo as any, {} as any);
    await expect(usecase.execute("")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("normalizes username before checking", async () => {
    repo.userExistsByUsername.mockResolvedValue(false);
    const usecase = new CheckUsernameUseCase(repo as any, {} as any);
    const res = await usecase.execute("Tề Trung Hiếu");
    expect(repo.userExistsByUsername).toHaveBeenCalledWith("tetrunghieu");
    expect(res).toEqual({ exists: false });
  });

  it("returns exists=true when found", async () => {
    repo.userExistsByUsername.mockResolvedValue(true);
    const usecase = new CheckUsernameUseCase(repo as any, {} as any);
    const res = await usecase.execute("hieutt");
    expect(res).toEqual({ exists: true });
  });
});
