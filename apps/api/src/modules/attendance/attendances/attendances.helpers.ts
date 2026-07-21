export function groupEventsToDailyRecords(rows: any[] /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
  const map = new Map<string, unknown>();

  for (const row of rows) {
    const date = row.date;
    const key = String(date);
    const record =
      map.get(key) ||
      ({
        id: `${row.employeeId}:${key}`,
        employeeId: row.employeeId,
        date: key,
        note: undefined,
        lunchDutyType: undefined,
        morning: {},
        noon: {},
        afternoon: {},
      } as any /* eslint-disable-line @typescript-eslint/no-explicit-any */);

    const session: "morning" | "noon" | "afternoon" =
      row.session ||
      (() => {
        const h = new Date(row.time).getHours();
        if (h < 12) return "morning";
        if (h < 14) return "noon";
        return "afternoon";
      })();

    if (row.lunchDutyType) {
      record.lunchDutyType = row.lunchDutyType;
    }

    if (row.type === "note") {
      record.note = row.note;
    } else if (row.type === "break_start") {
      record.noon = {
        ...(record.noon || {}),
        check: row.time,
        checkImage: row.image,
      };
    } else if (row.type === "check_in") {
      record[session] = {
        ...(record[session] || {}),
        checkin: row.time,
        checkinImage: row.image,
      };
    } else if (row.type === "check_out") {
      record[session] = {
        ...(record[session] || {}),
        checkout: row.time,
        checkoutImage: row.image,
      };
    }

    map.set(key, record);
  }

  return Array.from(map.values()).sort((a: any, b: any) => (a.date < b.date ? -1 : 1));
}






