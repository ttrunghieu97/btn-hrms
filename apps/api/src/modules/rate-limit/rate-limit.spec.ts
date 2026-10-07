// apps/api/src/modules/rate-limit/rate-limit.spec.ts
import { policiesFileSchema } from './policy.schema';
import { RateLimitPolicyRegistry, PolicyNotFoundError } from './rate-limit-policy.registry';
import { ZodError } from 'zod';
import rateLimitConfig from '../../config/rate-limit.config';
import * as fs from 'node:fs';

jest.mock('node:fs', () => {
  const original = jest.requireActual('node:fs');
  return {
    ...original,
    readFileSync: jest.fn(),
    existsSync: jest.fn(),
  };
});

describe('Rate Limit Configuration & Validation', () => {
  const mockReadFileSync = fs.readFileSync as jest.Mock;
  const mockExistsSync = fs.existsSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rateLimitConfig factory (bootstrap and file loading)', () => {
    it('should bootstrap successfully with a valid yml file', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(`
version: 1
policies:
  login:
    limit: 5
    windowSeconds: 60
    algorithm: FIXED_WINDOW
    keyStrategy: EMAIL
    prefix: ratelimit:login
    resetStrategy:
      resetStrategy: NONE
`);
      const config = rateLimitConfig();
      expect(config).toBeDefined();
      expect(config.version).toBe(1);
      expect(config.policies.login).toBeDefined();
      expect(config.policies.login?.limit).toBe(5);
    });

    it('should fail bootstrap (throw Error) if rate-limit.yml is missing', () => {
      mockExistsSync.mockReturnValue(false);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      expect(() => rateLimitConfig()).toThrow();
    });

    it('should fail bootstrap (throw ZodError) if YAML has an invalid schema', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(`
version: 1
policies:
  login:
    limit: -5 # Invalid negative limit
    windowSeconds: 60
    keyStrategy: EMAIL
    prefix: ratelimit:login
    resetStrategy:
      resetStrategy: NONE
`);
      expect(() => rateLimitConfig()).toThrow(ZodError);
    });
  });

  describe('policy.schema validation rules', () => {
    it('should fail if version is greater than 1 (supported version)', () => {
      const input = {
        version: 2, // Unsupported version
        policies: {},
      };
      expect(() => policiesFileSchema.parse(input)).toThrow(ZodError);
    });

    it('should fail if there are duplicate prefixes after trim, lowercase, and NFC normalization', () => {
      const input = {
        version: 1,
        policies: {
          policy1: {
            limit: 10,
            windowSeconds: 60,
            keyStrategy: 'EMAIL',
            prefix: '  TEST-PREFIX  ',
            resetStrategy: { resetStrategy: 'NONE' },
          },
          policy2: {
            limit: 20,
            windowSeconds: 60,
            keyStrategy: 'PHONE',
            prefix: 'test-prefix', // Dup prefix after trim + lowercase
            resetStrategy: { resetStrategy: 'NONE' },
          },
        },
      };
      expect(() => policiesFileSchema.parse(input)).toThrow(ZodError);
    });

    it('should fail if DECREMENT strategy is missing resetValue', () => {
      const input = {
        version: 1,
        policies: {
          policy1: {
            limit: 10,
            windowSeconds: 60,
            keyStrategy: 'EMAIL',
            prefix: 'p1',
            resetStrategy: {
              resetStrategy: 'DECREMENT',
              // resetValue is missing
            },
          },
        },
      };
      expect(() => policiesFileSchema.parse(input)).toThrow(ZodError);
    });

    it('should fail if DECAY strategy is missing factor', () => {
      const input = {
        version: 1,
        policies: {
          policy1: {
            limit: 10,
            windowSeconds: 60,
            keyStrategy: 'EMAIL',
            prefix: 'p1',
            resetStrategy: {
              resetStrategy: 'DECAY',
              // factor is missing
            },
          },
        },
      };
      expect(() => policiesFileSchema.parse(input)).toThrow(ZodError);
    });
  });

  describe('RateLimitPolicyRegistry', () => {
    const policies = {
      login: {
        limit: 5,
        windowSeconds: 60,
        algorithm: 'FIXED_WINDOW' as const,
        keyStrategy: 'EMAIL' as const,
        prefix: 'ratelimit:login',
        resetStrategy: { resetStrategy: 'NONE' as const },
        backoff: [],
      },
    };

    let registry: RateLimitPolicyRegistry;

    beforeEach(() => {
      registry = new RateLimitPolicyRegistry(policies);
    });

    it('should resolve a known policy successfully', () => {
      const policy = registry.resolve('login');
      expect(policy).toBeDefined();
      expect(policy.limit).toBe(5);
    });

    it('should throw PolicyNotFoundError if resolving an unknown policy', () => {
      expect(() => registry.resolve('unknown')).toThrow(PolicyNotFoundError);
      expect(() => registry.resolve('unknown')).toThrow("Rate limit policy 'unknown' not found.");
    });
  });
});
