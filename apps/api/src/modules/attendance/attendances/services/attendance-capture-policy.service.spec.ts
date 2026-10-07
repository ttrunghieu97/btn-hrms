import { ForbiddenException } from "@nestjs/common";
import { type ConfigService } from "@nestjs/config";
import { AttendanceCapturePolicyService } from "./attendance-capture-policy.service";

function makeConfig(values: Record<string, unknown>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as ConfigService;
}

describe("AttendanceCapturePolicyService", () => {
  it("allows upload fallback in dev by default", () => {
    const service = new AttendanceCapturePolicyService(
      makeConfig({ NODE_ENV: "development" }),
    );

    expect(() => service.assertImageSourceAllowed("upload")).not.toThrow();
    expect(() => service.assertImageSourceAllowed(undefined)).not.toThrow();
  });

  it("blocks upload fallback in prod by default", () => {
    const service = new AttendanceCapturePolicyService(
      makeConfig({ NODE_ENV: "production" }),
    );

    expect(() => service.assertImageSourceAllowed("upload")).toThrow(
      ForbiddenException,
    );
    expect(() => service.assertImageSourceAllowed(undefined)).toThrow(
      ForbiddenException,
    );
  });

  it("allows camera captures in prod", () => {
    const service = new AttendanceCapturePolicyService(
      makeConfig({ NODE_ENV: "production" }),
    );

    expect(() => service.assertImageSourceAllowed("camera")).not.toThrow();
  });
});
