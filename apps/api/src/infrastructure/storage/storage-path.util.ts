import { resolve, sep } from "path";

export const TEMP_TTL_MS = 24 * 60 * 60 * 1000;

export const OWNER_TYPE_PREFIX: Record<string, string> = {
  employee: "employees",
  task: "tasks",
  user: "users",
  application: "applications",
};

export function isS3NoSuchKey(err: unknown): boolean {
  const code =
    (err as Record<string, unknown>)?.Code ??
    (err as Record<string, unknown>)?.name ??
    (err as Record<string, unknown>)?.code ??
    "";
  return (
    code === "NoSuchKey" || code === "NotFound" || code === "404" || code === 404
  );
}

export function resolveTempKey(fileId: string, ext: string): string {
  return `temp/${fileId}.${ext}`;
}

export function resolveTargetKey(
  ownerType: string,
  ownerId: string,
  fileToken: string,
  ext: string,
): string {
  const prefix = OWNER_TYPE_PREFIX[ownerType] ?? ownerType;
  return `${prefix}/${ownerId}/${fileToken}.${ext}`;
}

export function resolveArchiveKey(key: string): string {
  return `archived/${key}`;
}

export function stripArchivePrefix(key: string): string {
  return key.replace(/^archived\//, "");
}

export function isTempKey(key: string): boolean {
  return key.startsWith("temp/");
}

export function isArchivedKey(key: string): boolean {
  return key.startsWith("archived/");
}

export function localPath(key: string): string | null {
  const publicRoot = resolve(process.cwd(), "public");
  const filePath = resolve(publicRoot, key.replace(/^\/+/, ""));
  if (!filePath.startsWith(publicRoot + sep)) return null;
  return filePath;
}

export function localPathForWrite(key: string): string {
  const publicRoot = resolve(process.cwd(), "public");
  const sanitized = key.replace(/^\/+/, "").replace(/\\/g, "/");
  if (sanitized.includes("\0") || sanitized.includes("..")) {
    throw new Error("Path traversal detected");
  }
  const target = resolve(publicRoot, sanitized);
  if (!target.startsWith(publicRoot + sep) && target !== publicRoot) {
    throw new Error("Path traversal detected");
  }
  return target;
}

export function extractStorageKey(tempUrlOrKey: string): string | null {
  const value = String(tempUrlOrKey ?? "").trim();
  if (!value) return null;
  if (value.startsWith("/public/")) return value.slice("/public/".length);
  if (value.startsWith("/files/")) return value.slice("/files/".length);
  return value.replace(/^\/+/, "");
}

export function safeExt(filename: string): string {
  const parts = filename.split(".");
  if (parts.length < 2) return "bin";
  const ext = parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext.length > 0 && ext.length <= 8 ? ext : "bin";
}

export function safeExtForMime(mimeType: string): string | null {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };
  return map[mimeType.toLowerCase()] ?? null;
}
