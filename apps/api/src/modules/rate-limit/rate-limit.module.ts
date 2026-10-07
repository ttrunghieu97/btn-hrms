// apps/api/src/modules/rate-limit/rate-limit.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RATE_LIMIT_POLICIES } from './constants';
import { RateLimitPolicyRegistry } from './rate-limit-policy.registry';

@Global()
@Module({
  providers: [
    {
      provide: RATE_LIMIT_POLICIES,
      useFactory: (configService: ConfigService) => {
        const policies = configService.get('rateLimit.policies');
        return policies || {};
      },
      inject: [ConfigService],
    },
    RateLimitPolicyRegistry,
  ],
  exports: [RATE_LIMIT_POLICIES, RateLimitPolicyRegistry],
})
export class RateLimitModule {}
