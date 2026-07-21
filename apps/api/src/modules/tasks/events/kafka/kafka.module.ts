/**
 * kafka.module.ts
 * Kafka module disabled — KAFKA_BROKERS/KAFKA_MODE env vars removed.
 * Always returns no-op null Kafka instance.
 */

import { DynamicModule, Global, Module } from "@nestjs/common";
import { KAFKA_TOKEN } from "./kafka.decorators";

@Global()
@Module({})
export class KafkaModule {
  static forRootAsync(): DynamicModule {
    return {
      module: KafkaModule,
      providers: [
        {
          provide: KAFKA_TOKEN,
          useFactory: () => null,
        },
      ],
      exports: [KAFKA_TOKEN],
    };
  }
}
