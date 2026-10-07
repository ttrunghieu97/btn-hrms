/**
 * Helper to parse a time string (e.g. "08:30") on a given date (e.g. "2026-07-09")
 * in a target IANA timezone (e.g. "Asia/Ho_Chi_Minh") into a UTC Date object.
 */
export function parseDateTimeInTimezone(
  dateStr: string,
  timeStr: string,
  timezone: string,
): Date {
  const [year = 0, month = 1, day = 1] = dateStr.split("-").map(Number);
  const [hour = 0, minute = 0] = timeStr.split(":").map(Number);


  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const utcEstimate = new Date(Date.UTC(year, month - 1, day, hour, minute));

  const parts = formatter.formatToParts(utcEstimate);
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  const localFormatted = Date.UTC(
    Number(partMap.year),
    Number(partMap.month) - 1,
    Number(partMap.day),
    Number(partMap.hour) === 24 ? 0 : Number(partMap.hour),
    Number(partMap.minute),
    Number(partMap.second),
  );

  const offsetMs = localFormatted - utcEstimate.getTime();
  return new Date(utcEstimate.getTime() - offsetMs);
}
