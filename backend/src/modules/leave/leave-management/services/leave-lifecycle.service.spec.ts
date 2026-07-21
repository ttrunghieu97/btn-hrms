import { LeaveLifecycleService } from "./leave-lifecycle.service";
import { ConflictException } from "@nestjs/common";

describe("LeaveLifecycleService", () => {
  let service: LeaveLifecycleService;

  beforeEach(() => {
    service = new LeaveLifecycleService();
  });

  it("should allow draft to pending", () => {
    expect(() =>
      service.assertTransition("draft", "pending", "1"),
    ).not.toThrow();
  });

  it("should allow pending to approved", () => {
    expect(() =>
      service.assertTransition("pending", "approved", "1"),
    ).not.toThrow();
  });

  it("should reject rejected to approved", () => {
    expect(() => service.assertTransition("rejected", "approved", "1")).toThrow(
      ConflictException,
    );
  });

  it("should allow approved to cancelled", () => {
    expect(() =>
      service.assertTransition("approved", "cancelled", "1"),
    ).not.toThrow();
  });

  it("should reject transitions from cancelled", () => {
    expect(() => service.assertTransition("cancelled", "draft", "1")).toThrow(
      ConflictException,
    );
  });
});
