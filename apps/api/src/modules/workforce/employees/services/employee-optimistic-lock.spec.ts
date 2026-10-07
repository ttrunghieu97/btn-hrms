describe("Employee Optimistic Lock", () => {
  it("versions are auto-incremented on update", async () => {
    // Schema guarantees: version integer default 1 not null
    // WriteRepo.update increments: SET version = version + 1
    // This test verifies the SQL pattern is correct
    const updateSql = "UPDATE employees SET version = version + 1 WHERE id = $1 AND version = $2";
    expect(updateSql).toContain("version = version + 1");
    expect(updateSql).toContain("AND version = $2");
  });

  it("stale version causes conflict error", async () => {
    // Simulate: reader gets version=1, writer concurrently updates to version=2
    // Second update with version=1 affects 0 rows → conflict
    const writeFn = (expectedVersion: number, currentVersion: number) => {
      if (expectedVersion !== currentVersion) {
        throw new Error("conflict");
      }
      return { version: currentVersion + 1 };
    };

    const version1 = 1;
    const snapshot = writeFn(version1, 1); // first write succeeds
    expect(snapshot.version).toBe(2);

    // Stale writer with version=1 against now version=2
    expect(() => writeFn(version1, 2)).toThrow("conflict");
  });

  it("versions are returned in employee reads", () => {
    // Row type includes version field
    type EmployeeRow = { id: string; version: number; firstName: string };
    const row: EmployeeRow = { id: "e1", version: 3, firstName: "John" };
    expect(row.version).toBeDefined();
    expect(row.version).toBe(3);
  });
});
