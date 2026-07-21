import { loadEnv } from "../infrastructure/database/env";

loadEnv();
import {
  setupTelemetry,
  shutdownTelemetry,
} from "../shared/observability/telemetry";

import { NestFactory } from "@nestjs/core";
import { type NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { BadRequestException, Logger, ValidationPipe } from "@nestjs/common";
import { SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import * as express from "express";
import cookieParser from "cookie-parser";
import { sql } from "drizzle-orm";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "../shared/filters/all-exceptions.filter";
import { DATABASE_CONNECTION } from "../infrastructure/database/database.provider";
import { normalizeValidationErrors } from "../shared/utils/validation-errors";
import { ERROR_CODES } from "../shared/constants/error-codes";
import { NormalizeDateInputPipe } from "../shared/pipes/normalize-date-input.pipe";
import { loadVaultEnv } from "../shared/config/vault-env";
import { initSentry } from "../shared/observability/sentry";
import {
  buildSwaggerConfig,
  SWAGGER_DOCS_PATH,
} from "../shared/swagger/swagger.config";
import { isBootstrapFlagEnabled } from "../shared/config/startup-flags";

function parseTrustProxy() {
  const raw = process.env.TRUST_PROXY;
  if (raw === undefined || raw === null || raw === "") return 1;
  const normalized = String(raw).trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  const num = Number(normalized);
  if (Number.isInteger(num) && num >= 0) return num;
  return 1;
}

function parseAllowedOrigins(rawOrigins: string): string[] {
  return rawOrigins
    .split(",")
    .map((v) => v.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function validateOriginUrls(origins: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (url.protocol === "http:" || url.protocol === "https:") {
        valid.push(origin);
      } else {
        invalid.push(origin);
      }
    } catch {
      invalid.push(origin);
    }
  }
  return { valid, invalid };
}

function envBool(name: string, defaultValue = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return defaultValue;
  const normalized = String(raw).trim().toLowerCase();
  return ["true", "1", "yes", "on"].includes(normalized);
}

async function bootstrap() {
  const t0 = performance.now();
  const preLogger = new Logger("Bootstrap");

  // Phase 1: OTEL must complete first — patches HTTP/DB modules before Nest DI
  await setupTelemetry();
  // Flush microtask queue to ensure all async instrumentation patches are applied
  await new Promise((resolve) => setImmediate(resolve));
  const t1 = performance.now();

  // Phase 2: Non-critical init in parallel — failures must not crash the app
  const preInitLabels = ["loadVaultEnv", "initSentry"] as const;
  const preInitResults = await Promise.allSettled([
    loadVaultEnv(preLogger),
    initSentry(preLogger),
  ]);
  for (let i = 0; i < preInitResults.length; i++) {
    const r = preInitResults[i]!;
    if (r.status === "rejected") {
      preLogger.warn(`${preInitLabels[i]} failed: ${r.reason}`);
    }
  }
  const t2 = performance.now();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const t3 = performance.now();

  app.set("trust proxy", parseTrustProxy());
  app.enableShutdownHooks();
  const logger = new Logger("Bootstrap");

  app.getHttpAdapter().getInstance().disable("x-powered-by");

  const rawFrontend = process.env.APP_URL || "";
  const parsedOrigins = parseAllowedOrigins(rawFrontend);
  if (!parsedOrigins.length) {
    logger.error("APP_URL must be set to one or more origins for CORS");
    process.exit(1);
  }

  const { valid: allowedOrigins, invalid: invalidOrigins } = validateOriginUrls(parsedOrigins);
  if (invalidOrigins.length > 0) {
    logger.warn(
      `APP_URL contains invalid origins (must be http:// or https://): ${invalidOrigins.join(", ")}`,
    );
  }
  if (!allowedOrigins.length) {
    logger.error("APP_URL must contain at least one valid http/https origin");
    process.exit(1);
  }

  const swaggerEnabled = isBootstrapFlagEnabled(
    "FEATURE_SWAGGER",
    envBool("FEATURE_SWAGGER", false),
    envBool("FEATURE_SWAGGER", false),
  );

  const maxBodyKb = Math.min(Number(process.env.MAX_REQUEST_BODY_KB || 512), 10_240);
  const maxBody = Number.isFinite(maxBodyKb) ? `${maxBodyKb}kb` : "512kb";
  app.use(express.json({ limit: maxBody }));
  app.use(cookieParser());
  // ponytail: CSP is set by Next.js middleware. API returns JSON, not HTML, so CSP is
  // redundant AND dangerous — double headers with Next.js middleware can conflict.
  // If API ever serves HTML endpoints (Swagger?) enable CSP only for those routes.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "same-origin" },
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    }),
  );

  app.useStaticAssets(join(process.cwd(), "public"), {
    prefix: "/public/",
  });

  app.setGlobalPrefix("api/v1");

  app.useGlobalFilters(app.get(AllExceptionsFilter));
  app.useGlobalPipes(
    new NormalizeDateInputPipe(),
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          message: "Validation failed",
          error: ERROR_CODES.VALIDATION_ERROR,
          details: normalizeValidationErrors(errors),
        }),
    }),
  );

  if (swaggerEnabled) {
    const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
    SwaggerModule.setup(SWAGGER_DOCS_PATH, app, document);
  }

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/+$/, "");
      if (allowedOrigins.includes(normalized)) return callback(null, true);
      return callback(null, false);
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders:
      "Authorization,Content-Type,x-request-id,Idempotency-Key,idempotency-key",
    credentials: true,
  });

  if (isBootstrapFlagEnabled("FEATURE_DB_VERIFY", false, true)) {
    try {
      const db = app.get(DATABASE_CONNECTION);
      await db.execute(sql`SELECT 1`);
      logger.log("Database connectivity verified successfully.");
    } catch (error) {
      logger.error("Database connection failed during bootstrap.");
      logger.error(error);
      process.exit(1);
    }
  } else {
    logger.log("Database connectivity verification skipped by bootstrap profile.");
  }

  const port = 3001;
  const host = "0.0.0.0";
  await app.listen(port, host);

  const t4 = performance.now();
  logger.log(
    `Started in ${(t4 - t0).toFixed(0)}ms ` +
      `(otelInit=${(t1 - t0).toFixed(0)}ms, ` +
      `externalInit=${(t2 - t1).toFixed(0)}ms, ` +
      `nestCreate=${(t3 - t2).toFixed(0)}ms, ` +
      `appListen=${(t4 - t3).toFixed(0)}ms)`,
  );
  logger.log(`Application is running on: http://${host}:${port}/api/v1`);
  if (swaggerEnabled) {
    logger.log(`API Documentation at: http://${host}:${port}/api/v1/docs`);
  } else {
    logger.log("API Documentation is disabled");
  }

  // ── Global crash handlers ─────────────────────────────────────
  process.on("uncaughtException", async (error) => {
    logger.error("UNCAUGHT EXCEPTION — terminating", error?.message);
    logger.error(error?.stack);
    try {
      await app.close();
    } catch {}
    try {
      await shutdownTelemetry();
    } catch {}
    process.exitCode = 1;
  });

  process.on("unhandledRejection", async (reason) => {
    logger.error("UNHANDLED REJECTION", reason?.toString());
    try {
      await app.close();
    } catch {}
    try {
      await shutdownTelemetry();
    } catch {}
    process.exitCode = 1;
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.log(`Received ${signal}. Shutting down gracefully...`);
    try {
      await app.close();
    } finally {
      await shutdownTelemetry();
    }
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  const logger = new Logger("Bootstrap");
  logger.error(err);
  process.exit(1);
});
