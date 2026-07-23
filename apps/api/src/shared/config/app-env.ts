import { type ConfigService } from "@nestjs/config";

export type AppEnv = "dev" | "prod";

type ConfigReader = Pick<ConfigService, "get">;

export function resolveAppEnv(config: ConfigReader): AppEnv {
  const rawNodeEnv = String(config.get("NODE_ENV") ?? process.env.NODE_ENV ?? "")
    .trim()
    .toLowerCase();

  return rawNodeEnv === "production" ? "prod" : "dev";
}

export function isProdAppEnv(config: ConfigReader): boolean {
  return resolveAppEnv(config) === "prod";
}

export function isAttendanceImageUploadAllowed(config: ConfigReader): boolean {
  return !isProdAppEnv(config);
}
