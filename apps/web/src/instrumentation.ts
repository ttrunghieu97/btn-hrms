export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initPerformanceMonitoring } = await import("./lib/performance");
    initPerformanceMonitoring();

    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
    const sentryDisabled = ["true", "1", "yes", "on"].includes(
      (process.env.NEXT_PUBLIC_SENTRY_DISABLED ?? "").trim().toLowerCase(),
    );

    if (sentryDsn && !sentryDisabled) {
      const { initSentry } = await import("./lib/observability/init");
      await initSentry();
    }
  }
}

