// src/modules/rate-limit/policy.schema.ts
import { z } from 'zod';

/**
 * Versioned rate‑limit policy definition.
 *
 * version: 1        // bump when the schema changes
 * policies: { ... } // map of policy keys to configuration objects
 */

// ---------- Enums ----------
export const algorithmEnum = z.enum(['FIXED_WINDOW', 'SLIDING_WINDOW']);
export const keyStrategyEnum = z.enum(['EMAIL', 'PHONE', 'SID', 'TOKEN_FAMILY']);
export const resetStrategyEnum = z.enum(['NONE', 'DELETE', 'DECREMENT', 'DECAY']);

// ---------- Back‑off entry ----------
const backoffEntrySchema = z.object({
  threshold: z.number().int().positive(), // attempts after which penalty applies
  durationSeconds: z.number().int().positive(), // block duration in seconds
});

// Ensure back‑off entries are strictly increasing in threshold
// and non‑decreasing in duration, with no duplicates.
const backoffSchema = z
  .array(backoffEntrySchema)
  .refine(
    (arr) => {
      let prev: z.infer<typeof backoffEntrySchema> | undefined;
      for (const cur of arr) {
        if (prev) {
          if (cur.threshold <= prev.threshold) return false; // not strictly increasing
          if (cur.durationSeconds < prev.durationSeconds) return false; // should not shrink
        }
        prev = cur;
      }
      return true;
    },
    {
      message:
        'Backoff entries must have strictly increasing thresholds and non‑decreasing durations.',
    },
  );

// ---------- Reset strategy discriminated union ----------
const resetBase = z.object({ resetStrategy: resetStrategyEnum });
const resetNone = resetBase.extend({ resetStrategy: z.literal('NONE') });
const resetDelete = resetBase.extend({ resetStrategy: z.literal('DELETE') });
const resetDecrement = resetBase.extend({
  resetStrategy: z.literal('DECREMENT'),
  resetValue: z.number().int().nonnegative(), // value to decrement by
});
const resetDecay = resetBase.extend({
  resetStrategy: z.literal('DECAY'),
  factor: z.number().positive(), // decay factor (e.g., 0.5 means halve the count)
});

const resetStrategySchema = z.discriminatedUnion('resetStrategy', [
  resetNone,
  resetDelete,
  resetDecrement,
  resetDecay,
]);

// ---------- Full policy definition ----------
export const policySchema = z.object({
  limit: z.number().int().positive(),
  windowSeconds: z.number().int().positive(), // business‑level time window
  algorithm: algorithmEnum.default('FIXED_WINDOW'),
  keyStrategy: keyStrategyEnum,
  prefix: z.string(), // used for building the Redis key prefix
  resetStrategy: resetStrategySchema,
  backoff: backoffSchema.default([]),
});

// ---------- File‑level schema ----------
export const policiesFileSchema = z.object({
  version: z.number().int().positive().max(1).default(1),
  policies: z.record(z.string(), policySchema),
}).refine(
  (file) => {
    const prefixes = new Set<string>();
    for (const policy of Object.values(file.policies)) {
      const normalized = policy.prefix.trim().toLowerCase().normalize('NFC');
      if (prefixes.has(normalized)) {
        return false;
      }
      prefixes.add(normalized);
    }
    return true;
  },
  {
    message: 'Policy prefixes must be unique after trim, lowercase, and NFC normalization.',
    path: ['policies'],
  }
);

export type Policy = z.infer<typeof policySchema>;
export type PoliciesFile = z.infer<typeof policiesFileSchema>;
