import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import {
  createErrorContractManifest,
  type ErrorContractManifest,
} from "../shared/constants/error-contracts";

const DEFAULT_OUTPUT_RELATIVE = "../web/error-contracts.manifest.json";

function normalizeEol(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

function serializeManifest(manifest: ErrorContractManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

async function generateErrorContracts() {
  const args = process.argv.slice(2);
  const packageRoot = resolve(__dirname, "../..");
  const outputArg = args.find((arg) => arg !== "--check");
  const outputPath = resolve(packageRoot, outputArg ?? DEFAULT_OUTPUT_RELATIVE);
  const nextContent = serializeManifest(createErrorContractManifest());

  if (args.includes("--check")) {
    const currentContent = await readFile(outputPath, "utf8");
    if (normalizeEol(currentContent) !== normalizeEol(nextContent)) {
      throw new Error(
        `Error contract manifest is stale: ${outputPath}. Run \`pnpm --filter @project/api error-contracts:json ${outputArg ?? DEFAULT_OUTPUT_RELATIVE}\`.`,
      );
    }

    console.log(`Error contract manifest is up to date: ${outputPath}`);
    return;
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, nextContent, "utf8");
  console.log(`Error contract manifest written to ${outputPath}`);
}

void (async () => {
  try {
    await generateErrorContracts();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
