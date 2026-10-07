// apps/api/src/config/rate-limit.config.ts
import { registerAs } from '@nestjs/config';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { policiesFileSchema, type PoliciesFile } from '../modules/rate-limit/policy.schema';

/**
 * Loads and validates the rate‑limit policies YAML file located at `apps/api/config/rate-limit.yml`.
 * Validation errors will cause the NestJS application to fail fast on startup.
 */
export default registerAs('rateLimit', (): PoliciesFile => {
  // Try both possible process.cwd() locations
  let filePath = join(process.cwd(), 'apps/api/config/rate-limit.yml');
  if (!existsSync(filePath)) {
    filePath = join(process.cwd(), 'config/rate-limit.yml');
  }

  const raw = yaml.load(readFileSync(filePath, 'utf8'));
  return policiesFileSchema.parse(raw);
});
