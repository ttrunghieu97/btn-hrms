import { CheckInAttendanceUseCase } from "./checkin-attendance.usecase";

describe(CheckInAttendanceUseCase.name, () => {
  it("checks in a registered attendee", async () => {
    const repo = {
      findAttendee: jest.fn().mockResolvedValue({ id: "att-1", sessionId: "sess-1", employeeId: "emp-1", status: "registered" }),
      findById: jest.fn().mockResolvedValue({ id: "sess-1", courseId: "c1" }),
      updateAttendee: jest.fn().mockResolvedValue({}),
    };
    const eventOutbox = { stage: jest.fn().mockResolvedValue({ id: "out-1" }) };
    const useCase = new CheckInAttendanceUseCase(repo as any, eventOutbox as any);
    await useCase.execute("sess-1", "emp-1");

    expect(repo.updateAttendee).toHaveBeenCalledWith("att-1", { status: "attended", checkedInAt: expect.any(Date) });
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "learning.attendance.marked.v1" }),
    );
  });

  it("rejects check-in when not registered", async () => {
    const repo = { findAttendee: jest.fn().mockResolvedValue(null) };
    const useCase = new CheckInAttendanceUseCase(repo as any, {} as any);
    await expect(useCase.execute("sess-1", "emp-1")).rejects.toThrow("Not registered");
  });
});
