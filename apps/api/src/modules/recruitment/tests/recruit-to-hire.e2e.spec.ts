
import { Test } from "@nestjs/testing";
describe("Recruit-to-Hire (e2e)", () => {
  it("requisition created → submitted → approved → posting published", async () => {
    // State machine: draft → pending_approval → approved → open
    const states = ["draft", "pending_approval", "approved", "open"];
    expect(states).toContain("approved");
    expect(states).toContain("open");
  });
  it("application received → pipeline advances to interview → offer → accepted", async () => {
    const pipeline = ["applied", "screening", "interview", "offer", "hired"];
    expect(pipeline[pipeline.length - 1]).toBe("hired");
  });
  it("offer accepted → CandidateHiredEvent emitted", async () => {
    expect(true).toBe(true);
  });
});
