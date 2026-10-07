import { Injectable } from "@nestjs/common";

type RangeInput = {
  effectiveFrom: string;
  effectiveTo?: string | null;
};

@Injectable()
export class ShiftOverlapService {
  hasConflict(target: RangeInput, existing: RangeInput[]): boolean {
    const targetStart = new Date(`${target.effectiveFrom}T00:00:00.000Z`);
    const targetEnd = target.effectiveTo
      ? new Date(`${target.effectiveTo}T00:00:00.000Z`)
      : null;

    return existing.some((row) => {
      const rowStart = new Date(`${row.effectiveFrom}T00:00:00.000Z`);
      const rowEnd = row.effectiveTo
        ? new Date(`${row.effectiveTo}T00:00:00.000Z`)
        : null;

      const left = targetEnd ? targetEnd >= rowStart : true;
      const right = rowEnd ? rowEnd >= targetStart : true;
      return left && right;
    });
  }
}

