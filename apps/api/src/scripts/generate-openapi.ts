import { NestFactory } from "@nestjs/core";
import { writeFile, mkdir } from "fs/promises";
import { dirname, resolve } from "path";
import { SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "../app/app.module";
import { buildSwaggerConfig } from "../shared/swagger/swagger.config";

function normalizeNullableTypes(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeNullableTypes);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const source = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};

  for (const [key, nested] of Object.entries(source)) {
    normalized[key] = normalizeNullableTypes(nested);
  }

  if (normalized.type === "null") {
    delete normalized.type;
    normalized.nullable = true;
  }

  return normalized;
}


const DEFAULT_OUTPUT_RELATIVE = "../web/openapi.json";
const API_PREFIX = "api/v1";

async function generateOpenApi() {
  // Ensure required env vars for validateEnv() are present when generating docs.
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/postgres";
  process.env.AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || "openapi-docs";
  process.env.AUTH_JWT_REFRESH_SECRET = process.env.AUTH_JWT_REFRESH_SECRET || "openapi-docs";
  process.env.APP_URL = process.env.APP_URL || "http://localhost:5173";

  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });
  app.setGlobalPrefix(API_PREFIX);
  await app.init();

  const rawDocument = SwaggerModule.createDocument(app, buildSwaggerConfig());
  const document = normalizeNullableTypes(rawDocument);

  const packageRoot = resolve(__dirname, "../..");
  const outputArg = process.argv[2];
  const outputPath = resolve(packageRoot, outputArg ?? DEFAULT_OUTPUT_RELATIVE);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(document, null, 2), "utf8");
  await app.close();

  console.log(`OpenAPI written to ${outputPath}`);
}

void (async () => {
  try {
    await generateOpenApi();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
