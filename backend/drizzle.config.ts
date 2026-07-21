import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import * as fs from "fs";

if (fs.existsSync(".env")) {
  dotenv.config();
} else if (fs.existsSync(".env.example")) {
  dotenv.config({ path: ".env.example" });
}

export default defineConfig({
  schema: "./src/infrastructure/database/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL!,
  },
});
