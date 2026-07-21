/**
 * kafka.decorators.ts
 * Token + inject decorator for the Kafka client.
 */
import { Inject } from "@nestjs/common";

export const KAFKA_TOKEN = "KAFKA_CLIENT";

export const InjectKafka = (): ParameterDecorator => Inject(KAFKA_TOKEN);
