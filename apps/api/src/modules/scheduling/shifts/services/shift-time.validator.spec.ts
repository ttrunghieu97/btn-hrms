import { BadRequestException } from "@nestjs/common";
import {
  validateShiftTemplateTimes,
  calculateScheduledMinutes,
} from "../shift-catalog/services/shift-time.validator";

describe("ShiftTimeValidator", () => {
  describe("validateShiftTemplateTimes", () => {
    it("should throw if start and end times are identical", () => {
      expect(() =>
        validateShiftTemplateTimes({ startTime: "08:00", endTime: "08:00" }),
      ).toThrow(BadRequestException);
    });

    it("should throw for non-overnight shift ending before start", () => {
      expect(() =>
        validateShiftTemplateTimes({
          startTime: "17:00",
          endTime: "08:00",
          overnight: false,
        }),
      ).toThrow(BadRequestException);
    });

    it("should throw for overnight shift ending after start", () => {
      expect(() =>
        validateShiftTemplateTimes({
          startTime: "08:00",
          endTime: "17:00",
          overnight: true,
        }),
      ).toThrow(BadRequestException);
    });

    it("should accept valid non-overnight shift", () => {
      expect(() =>
        validateShiftTemplateTimes({
          startTime: "08:00",
          endTime: "17:00",
          overnight: false,
        }),
      ).not.toThrow();
    });

    it("should accept valid overnight shift", () => {
      expect(() =>
        validateShiftTemplateTimes({
          startTime: "22:00",
          endTime: "06:00",
          overnight: true,
        }),
      ).not.toThrow();
    });
  });

  describe("calculateScheduledMinutes", () => {
    it("should calculate standard shift minutes correctly", () => {
      const mins = calculateScheduledMinutes({
        startTime: "08:00",
        endTime: "17:00",
        breakMinutes: 60,
      });
      expect(mins).toBe(480); // 9 hours - 1 hour break = 540 - 60 = 480
    });

    it("should calculate overnight shift minutes correctly", () => {
      const mins = calculateScheduledMinutes({
        startTime: "22:00",
        endTime: "06:00",
        overnight: true,
        breakMinutes: 0,
      });
      expect(mins).toBe(480); // 10pm to 6am = 8 hours
    });
  });
});
