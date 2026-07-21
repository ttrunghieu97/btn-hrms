function envBool(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return defaultValue;
  const normalized = String(raw).trim().toLowerCase();
  return ["true", "1", "yes", "on"].includes(normalized);
}

export function isProductionRuntime(): boolean {
  return String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";
}

export function isLocalRuntime(): boolean {
  return !isProductionRuntime();
}

export function isBootstrapFlagEnabled(
  name: string,
  localDefault: boolean,
  productionDefault: boolean,
): boolean {
  return envBool(name, isProductionRuntime() ? productionDefault : localDefault);
}
