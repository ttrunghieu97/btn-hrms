import { ConfigService } from "@nestjs/config";
import { KafkaModule } from "./kafka.module";

function providerFactory() {
  const mod = KafkaModule.forRootAsync();
  return (
    mod.providers as any[]
  ).find((p) => p.provide === Symbol.for("KAFKA_TOKEN")) ?? mod.providers![0];
}

describe("KafkaModule config", () => {
  it("returns null when KAFKA_MODE=disabled", () => {
    const provider = providerFactory();
    const config = new ConfigService({ KAFKA_MODE: "disabled" });
    expect(provider.useFactory(config)).toBeNull();
  });

  it("throws when KAFKA_MODE=required and brokers are missing", () => {
    const provider = providerFactory();
    const config = new ConfigService({ KAFKA_MODE: "required" });
    expect(() => provider.useFactory(config)).toThrow(/KAFKA_BROKERS/);
  });

  it("creates client when brokers are configured", () => {
    const provider = providerFactory();
    const config = new ConfigService({
      KAFKA_MODE: "optional",
      KAFKA_BROKERS: "localhost:9092",
      KAFKA_CLIENT_ID: "hrms-api",
    });
    expect(provider.useFactory(config)).toBeTruthy();
  });
});
