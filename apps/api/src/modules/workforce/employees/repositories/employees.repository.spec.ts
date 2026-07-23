import { EmployeesRepository } from "./employees.repository";
import { EmployeeQueryBuilder } from "./employee-query-builder";

describe(EmployeesRepository.name, () => {
  const makeTx = () => {
    const updateWhere = jest.fn().mockResolvedValue(undefined);
    const updateSet = jest.fn().mockReturnValue({ where: updateWhere });
    const update = jest.fn().mockReturnValue({ set: updateSet });
    const insertValues = jest.fn().mockResolvedValue(undefined);
    const insert = jest.fn().mockReturnValue({ values: insertValues });
    const deleteWhere = jest.fn().mockResolvedValue(undefined);
    const del = jest.fn().mockReturnValue({ where: deleteWhere });

    return {
      tx: {
        update,
        insert,
        delete: del,
      },
      spies: {
        update,
        updateSet,
        updateWhere,
        insert,
        insertValues,
        del,
        deleteWhere,
      },
    };
  };

  const makeRepo = () => new EmployeesRepository({} as any);

  it("binds avatar by updating employee avatarFileId", async () => {
    const repo = makeRepo();
    const { tx, spies } = makeTx();

    await repo.bindEmployeeAvatar("emp-1", "att-avatar", tx as any);

    expect(spies.update).toHaveBeenCalledTimes(1);
    expect(spies.insert).not.toHaveBeenCalled();
    expect(spies.updateSet).toHaveBeenCalledWith({
      avatarFileId: "att-avatar",
      updatedAt: expect.any(Date),
    });
  });

  it("detaches avatar by clearing employee avatarFileId", async () => {
    const repo = makeRepo();
    const { tx, spies } = makeTx();

    await repo.replaceEmployeeAvatar("emp-1", null, tx as any);

    expect(spies.update).toHaveBeenCalledTimes(1);
    expect(spies.insert).not.toHaveBeenCalled();
    expect(spies.updateSet).toHaveBeenCalledWith({
      avatarFileId: null,
      updatedAt: expect.any(Date),
    });
  });

  it("replaces avatar by updating employee avatarFileId", async () => {
    const repo = makeRepo();
    const { tx, spies } = makeTx();

    await repo.replaceEmployeeAvatar("emp-1", "att-avatar-2", tx as any);

    expect(spies.update).toHaveBeenCalledTimes(1);
    expect(spies.insert).not.toHaveBeenCalled();
    expect(spies.updateSet).toHaveBeenCalledWith({
      avatarFileId: "att-avatar-2",
      updatedAt: expect.any(Date),
    });
  });
});
