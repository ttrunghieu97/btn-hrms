export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const [{ initPerformanceMonitoring }, { envClient }] = await Promise.all([
      import("./lib/performance"),
      import("./lib/env.client"),
    ]);
    initPerformanceMonitoring();

    if (envClient.sentryDsn && !envClient.sentryDisabled) {
      const { initSentry } = await import("./lib/observability/init");
      await initSentry();
    }
  }
}

