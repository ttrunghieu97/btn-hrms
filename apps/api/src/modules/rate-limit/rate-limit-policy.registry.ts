// apps/api/src/modules/rate-limit/rate-limit-policy.registry.ts
import { Injectable, Inject } from '@nestjs/common';
import { RATE_LIMIT_POLICIES } from './constants';
import { Policy } from './policy.schema';

export class PolicyNotFoundError extends Error {
  constructor(policyName: string) {
    super(`Rate limit policy '${policyName}' not found.`);
    this.name = 'PolicyNotFoundError';
  }
}

@Injectable()
export class RateLimitPolicyRegistry {
  constructor(
    @Inject(RATE_LIMIT_POLICIES)
    private readonly policies: Record<string, Policy>,
  ) {}

  resolve(name: string): Policy {
    const policy = this.policies[name];
    if (!policy) {
      throw new PolicyNotFoundError(name);
    }
    return policy;
  }
}
