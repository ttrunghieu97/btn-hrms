import type { PayrollPeriod } from '../types';

function parseValidYearMonth(
  dto: Record<string, unknown>,
  startsOn?: string,
  code?: string
): { year?: number; month?: number } {
  const rawYear = Number(dto.year);
  const rawMonth = Number(dto.month);
  if (
    Number.isInteger(rawYear) &&
    rawYear >= 1970 &&
    rawYear <= 2100 &&
    Number.isInteger(rawMonth) &&
    rawMonth >= 1 &&
    rawMonth <= 12
  ) {
    return { year: rawYear, month: rawMonth };
  }

  const dateMatch = typeof startsOn === 'string' ? startsOn.match(/^(\d{4})-(\d{2})/) : null;
  if (dateMatch) {
    const y = Number(dateMatch[1]);
    const m = Number(dateMatch[2]);
    if (y >= 1970 && y <= 2100 && m >= 1 && m <= 12) {
      return { year: y, month: m };
    }
  }

  const codeMatch = typeof code === 'string' ? code.match(/(\d{4})[-_/]?(\d{2})/) : null;
  if (codeMatch) {
    const y = Number(codeMatch[1]);
    const m = Number(codeMatch[2]);
    if (y >= 1970 && y <= 2100 && m >= 1 && m <= 12) {
      return { year: y, month: m };
    }
  }

  return {};
}

export function toPayrollPeriod(dto: Record<string, unknown>): PayrollPeriod {
  const startsOn = (dto.startsOn as string) ?? '';
  const code = (dto.code as string) ?? '';
  const { year, month } = parseValidYearMonth(dto, startsOn, code);
  const attendancePeriodId =
    typeof dto.attendancePeriodId === 'string' && dto.attendancePeriodId.length > 0
      ? dto.attendancePeriodId
      : null;

  return {
    id: dto.id as string,
    code,
    name: dto.name as string,
    ...(year !== undefined ? { year } : {}),
    ...(month !== undefined ? { month } : {}),
    attendancePeriodId,
    startsOn,
    endsOn: dto.endsOn as string,
    payDate: (dto.payDate as string) ?? null,
    status: dto.status as PayrollPeriod['status'],
    createdAt: dto.createdAt as string,
    updatedAt: dto.updatedAt as string,
  };
}

