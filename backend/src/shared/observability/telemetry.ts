import { Logger } from "@nestjs/common";

const logger = new Logger("Telemetry");

let sdk: { shutdown: () => Promise<void> } | null = null;

export async function setupTelemetry(): Promise<void> {
  const exporterUrl = process.env.OBSERVABILITY_OTEL_URL;
  if (!exporterUrl) {
    logger.log("OpenTelemetry init skipped (OBSERVABILITY_OTEL_URL missing).");
    return;
  }

  // Dynamic import — cost only paid when OTEL is actually enabled
  const { diag, DiagConsoleLogger, DiagLogLevel } = await import(
    "@opentelemetry/api"
  );
  const { NodeSDK } = await import("@opentelemetry/sdk-node");
  const { getNodeAutoInstrumentations } = await import(
    "@opentelemetry/auto-instrumentations-node"
  );
  const { OTLPTraceExporter } = await import(
    "@opentelemetry/exporter-trace-otlp-http"
  );
  const { OTLPMetricExporter } = await import(
    "@opentelemetry/exporter-metrics-otlp-http"
  );
  const { OTLPLogExporter } = await import(
    "@opentelemetry/exporter-logs-otlp-http"
  );
  const { PeriodicExportingMetricReader } = await import(
    "@opentelemetry/sdk-metrics"
  );
  const { SimpleLogRecordProcessor } = await import(
    "@opentelemetry/sdk-logs"
  );

  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

  const tracesUrl = exporterUrl ? `${exporterUrl}/v1/traces` : undefined;
  const metricsUrl = exporterUrl ? `${exporterUrl}/v1/metrics` : undefined;
  const logsUrl = exporterUrl ? `${exporterUrl}/v1/logs` : undefined;

  const traceExporter = new OTLPTraceExporter(
    tracesUrl ? { url: tracesUrl } : undefined,
  );
  const metricExporter = new OTLPMetricExporter(
    metricsUrl ? { url: metricsUrl } : undefined,
  );
  const logExporter = new OTLPLogExporter(
    logsUrl ? { url: logsUrl } : undefined,
  );

  const nodeSdk = new NodeSDK({
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 10000,
    }),
    logRecordProcessor: new SimpleLogRecordProcessor(logExporter),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  nodeSdk.start();
  sdk = nodeSdk;
  logger.log(
    "OpenTelemetry initialized with traces, metrics, and logs exporters",
  );
}

export async function shutdownTelemetry(): Promise<void> {
  if (!sdk) return;
  await sdk.shutdown();
  sdk = null;
}
