import { AttendanceSummariesRepository } from "./attendance-summaries.repository";

describe(AttendanceSummariesRepository.name, () => {
  it("finds attendance summary by id", async () => {
    const db = {
      query: {
        attendanceDailySummaries: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      },
    };

    const repo = new AttendanceSummariesRepository(db as any);
    await repo.findById("sum-1");

    expect(db.query.attendanceDailySummaries.findFirst).toHaveBeenCalled();
  });
});
