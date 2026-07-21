import { ArgumentMetadata, Injectable, PipeTransform } from "@nestjs/common";
import { normalizeDdMmYyyyToIsoDate } from "../utils/date-format";

@Injectable()
export class NormalizeDateInputPipe implements PipeTransform {
  transform(value: unknown, _metadata: ArgumentMetadata) {
    if (value === null || value === undefined) return value;
    return this.normalizeValue(value);
  }

  private normalizeValue(value: unknown): unknown {
    if (typeof value === "string") {
      return normalizeDdMmYyyyToIsoDate(value) ?? value;
    }

    if (value instanceof Date || Buffer.isBuffer(value)) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeValue(item));
    }

    if (typeof value === "object" && value !== null) {
      const normalizedObject: Record<string, unknown> = {};
      for (const [key, nestedValue] of Object.entries(
        value as Record<string, unknown>,
      )) {
        normalizedObject[key] = this.normalizeValue(nestedValue);
      }
      return normalizedObject;
    }

    return value;
  }
}
