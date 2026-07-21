import { CheckAttendanceUseCase } from "./check-attendance.usecase";
import { AttendanceVerificationPipeline } from "../pipeline/pipeline-runner";
import { EmployeeContextStep } from "../pipeline/steps/employee-context.step";
import { GeofenceStep } from "../pipeline/steps/geofence.step";
import { IpWhitelistStep } from "../pipeline/steps/ip-whitelist.step";
import { EvidenceStep } from "../pipeline/steps/evidence.step";
import { AttendanceEvidenceService } from "../services/attendance-evidence.service";

describe(CheckAttendanceUseCase.name, () => {
  function buildUseCase(overrides: Record<string, any> = {}) {
    const attendancesRepo = {
      insertEvent: jest.fn().mockResolvedValue({ id: "att-1" }),
      transaction: jest.fn().mockImplementation(async (fn) => fn({})),
      ...overrides.attendancesRepo,
    };
    const eventOutbox = {
      stage: jest.fn().mockResolvedValue({ id: "out-1" }),
      ...overrides.eventOutbox,
    };
    const workforcePort = {
      getEmployeeContext: jest.fn().mockResolvedValue({
        employeeId: "emp-1",
        userId: "user-1",
        departmentId: null,
        employmentStatus: "eligible",
        currentSite: null,
        ...overrides.employeeContextOverride,
      }),
      ...overrides.workforcePort,
    };
    const ipWhitelist = { isAllowed: jest.fn().mockReturnValue(true) };
    const selfieValidation = {
      validate: jest
        .fn()
        .mockReturnValue({ ok: true, mime: "image/jpeg", width: 480, height: 480 }),
    };
    const facePresence = {
      detect: jest
        .fn()
        .mockResolvedValue({ facePresent: true, confidence: 0.99, provider: "noop" }),
    };
    const selfieStorage = {
      store: jest
        .fn()
        .mockResolvedValue({ key: "attendance/selfies/x.jpg", url: "/files/x.jpg" }),
    };

    const requestContext = {
      get: jest.fn().mockReturnValue({ userId: "mock-user" }),
      getTraceId: jest.fn().mockReturnValue("mock-trace"),
    };

    const metrics = {
      incrementAttendanceCheck: jest.fn(),
      observeAttendanceCheckDuration: jest.fn(),
      observeAttendanceVerificationStep: jest.fn(),
      incrementAttendanceGeoFail: jest.fn(),
      incrementAttendanceIpFail: jest.fn(),
      incrementAttendanceFaceFail: jest.fn(),
      observeAttendanceUploadDuration: jest.fn(),
    };

    const clock = {
      today: jest.fn().mockReturnValue("2026-03-14"),
      now: jest.fn().mockReturnValue(new Date("2026-03-14T08:00:00Z")),
    };

    const pipeline = new AttendanceVerificationPipeline(requestContext as any, metrics as any);
    const attendancePolicy = { allowCheckInWithoutShift: true };
    const employeeContextStep = new EmployeeContextStep(workforcePort, attendancePolicy);
    const geofenceStep = new GeofenceStep(metrics as any);
    const ipWhitelistStep = new IpWhitelistStep(ipWhitelist, metrics as any);
    const evidenceService = new AttendanceEvidenceService(
      requestContext as any,
      selfieValidation,
      facePresence,
      selfieStorage as any,
      metrics as any,
    );
    const evidenceStep = new EvidenceStep(evidenceService, metrics as any);

    const sessionService = {
      resolveSession: jest.fn().mockResolvedValue({ sessionId: null, sessionType: "MORNING" }),
    };

    const useCase = new CheckAttendanceUseCase(
      attendancesRepo,
      eventOutbox,
      pipeline,
      employeeContextStep,
      geofenceStep,
      ipWhitelistStep,
      evidenceStep,
      requestContext as any,
      metrics as any,
      sessionService as any,
      clock as any,
    );
    return {
      useCase,
      attendancesRepo,
      eventOutbox,
      workforcePort,
      ipWhitelist,
      selfieValidation,
      facePresence,
      selfieStorage,
      requestContext,
    };
  }

  it("stages attendance checked event in outbox instead of publishing directly", async () => {
    const { useCase, attendancesRepo, eventOutbox } = buildUseCase();

    await useCase.execute(
      "emp-1",
      "check_in",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { selfie: { buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]), mime: "image/jpeg" } },
    );

    expect(attendancesRepo.insertEvent).toHaveBeenCalled();
    expect(eventOutbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "AttendanceCheckedEvent" }),
      expect.anything(),
    );
  });

  it("rejects check_in without a selfie", async () => {
    const { useCase } = buildUseCase();
    await expect(
      useCase.execute("emp-1", "check_in"),
    ).rejects.toMatchObject({ message: expect.stringContaining("Selfie") });
  });

  it("rejects punch when source IP is not in site whitelist", async () => {
    const { useCase, ipWhitelist } = buildUseCase({
      employeeContextOverride: {
        currentSite: {
          id: "site-1",
          latitude: null,
          longitude: null,
          radiusMeters: null,
          allowedIpCidrs: ["10.0.0.0/8"],
        },
      },
    });
    ipWhitelist.isAllowed.mockReturnValueOnce(false);

    await expect(
      useCase.execute(
        "emp-1",
        "check_in",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        {
          ipAddress: "8.8.8.8",
          selfie: { buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]), mime: "image/jpeg" },
        },
      ),
    ).rejects.toMatchObject({ message: expect.stringContaining("network") });
  });

  it("flags punch (verification_status='flagged') when face is not detected", async () => {
    const { useCase, attendancesRepo, facePresence } = buildUseCase();
    facePresence.detect.mockResolvedValueOnce({
      facePresent: false,
      confidence: 0.1,
      provider: "noop",
    });

    await useCase.execute(
      "emp-1",
      "check_in",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { selfie: { buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]), mime: "image/jpeg" } },
    );

    expect(attendancesRepo.insertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        verificationStatus: "flagged",
        flags: expect.objectContaining({ selfieLowConfidence: true }),
      }),
      expect.anything(),
    );
  });
});
