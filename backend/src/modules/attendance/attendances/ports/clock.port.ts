/**
 * ClockPort — abstraction over system clock.
 *
 * Enables deterministic time in tests without mocking Date/performance.
 * For attendance, time source reliability is critical (punch time,
 * session detection, SLA monitoring).
 */
export const CLOCK_PORT = Symbol("CLOCK_PORT");

export interface ClockPort {
  now(): Date;
  nowIso(): string;
  today(): string; // "YYYY-MM-DD"
  nowMs(): number; // performance.now() equivalent
  nowEpochMs(): number; // Date.now() equivalent
}
