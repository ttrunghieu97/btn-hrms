import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

export function loadEnv(): void {
  const candidates = [
    path.resolve(__dirname, "../../../../../.env"),
    path.resolve(__dirname, "../../../.env"),
    path.resolve(process.cwd(), ".env"),
  ];

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    } else {
      const examplePath = `${envPath}.example`;
      if (fs.existsSync(examplePath)) {
        dotenv.config({ path: examplePath, override: false });
      }
    }
  }
}

