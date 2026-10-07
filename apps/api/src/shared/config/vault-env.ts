import { type Logger } from "@nestjs/common";
import { isBootstrapFlagEnabled } from "./startup-flags";

type VaultSecretResponse = {
  data?: {
    data?: Record<string, string>;
  };
};

const DEFAULT_VAULT_KV_PATH = "secret/data/btn-hrms";

function shouldFailFast(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    isBootstrapFlagEnabled("FEATURE_VAULT", false, true)
  );
}

function failOrLog(logger: Logger, message: string) {
  if (shouldFailFast()) {
    throw new Error(message);
  }
  logger.error(message);
}

export async function loadVaultEnv(logger: Logger) {
  if (!isBootstrapFlagEnabled("FEATURE_VAULT", false, true)) {
    logger.log("Vault env load skipped by bootstrap profile.");
    return;
  }

  const addr = process.env.VAULT_ADDR;
  const token = process.env.VAULT_TOKEN;
  if (!addr || !token) {
    failOrLog(logger, "Vault env load failed: VAULT_ADDR or VAULT_TOKEN missing.");
    return;
  }

  const path = process.env.VAULT_KV_PATH || DEFAULT_VAULT_KV_PATH;
  const url = `${addr.replace(/\/+$/, "")}/v1/${path.replace(/^\/+/, "")}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "X-Vault-Token": token },
    });
    if (!res.ok) {
      failOrLog(logger, `Vault env load failed: ${res.status} ${res.statusText}`);
      return;
    }
    const json = (await res.json()) as VaultSecretResponse;
    const data = json?.data?.data;
    if (!data || typeof data !== "object") {
      failOrLog(logger, "Vault env load failed: empty data");
      return;
    }
    for (const [key, value] of Object.entries(data)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
    logger.log("Vault env load succeeded.");
  } catch (err: any) {
    failOrLog(logger, `Vault env load error: ${err?.message || String(err)}`);
  }
}
