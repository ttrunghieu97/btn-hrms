function sanitizeString(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function normalizeUsername(value?: string): string {
  return sanitizeString(value ?? "");
}

export function buildUsernameFromName(
  firstName?: string,
  lastName?: string,
): string {
  const first = sanitizeString(firstName ?? "");
  const rawLast = (lastName ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
  const initials = rawLast
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("");
  return `${first}${initials}`;
}

function sanitizePathSegment(
  value: string | undefined,
  fallback = "unknown",
) {
  const raw = value ?? "";
  const safe = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/^\.+/, "")
    .trim();
  return safe.length ? safe : fallback;
}

function sanitizeFilename(
  value: string | undefined,
  fallback = "file",
) {
  const base = sanitizePathSegment(value, fallback);
  return base.replace(/[/\\]/g, "");
}


