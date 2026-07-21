import { ConfigService } from "@nestjs/config";
import { KafkaModule } from "./kafka.module";

function providerFactory() {
  const mod = KafkaModule.forRootAsync();
  return (
    mod.providers as any[]
  ).find((p) => p.provide === Symbol.for("KAFKA_TOKEN")) ?? mod.providers![0];
}

describe("KafkaModule config", () => {
  it("always returns null because Kafka module is disabled", () => {
    const provider = providerFactory();
    
    const configDisabled = new ConfigService({ KAFKA_MODE: "disabled" });
    expect(provider.useFactory(configDisabled)).toBeNull();

    const configRequired = new ConfigService({ KAFKA_MODE: "required" });
    expect(provider.useFactory(configRequired)).toBeNull();

    const configOptional = new ConfigService({
      KAFKA_MODE: "optional",
      KAFKA_BROKERS: "localhost:9092",
      KAFKA_CLIENT_ID: "hrms-api",
    });
    expect(provider.useFactory(configOptional)).toBeNull();
  });
});
