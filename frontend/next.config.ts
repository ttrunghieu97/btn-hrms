import path from 'node:path';
import fs from 'node:fs';
import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import * as dotenv from 'dotenv';

// Fallback to .env.example if .env is missing
const envPath = path.resolve(__dirname, '.env');
const examplePath = path.resolve(__dirname, '.env.example');
if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
  dotenv.config({ path: examplePath });
}




const baseConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  // Required for standalone mode in a pnpm monorepo: traces dependencies from workspace root
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  allowedDevOrigins: ['10.8.1.84', '10.10.3.100', '10.10.3.231'],
  experimental: {
    cpus: 1,
    webpackBuildWorker: false,
    workerThreads: false,
  },
  turbopack: {
    root: path.resolve(__dirname, '../../'),
  },
  async rewrites() {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

    const rewrites: Array<{source:string;destination:string}> = [];

    if (apiBaseUrl) {
      rewrites.push({
        source: "/files/:path*",
        destination: `${apiBaseUrl}/files/:path*`,
      });
      rewrites.push({
        source: "/public/:path*",
        destination: `${apiBaseUrl}/public/:path*`,
      });
      rewrites.push({
        source: "/api/v1/:path*",
        destination: `${apiBaseUrl}/:path*`,
      });
    }

    return rewrites;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.slingacademy.com",
        port: "",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  transpilePackages: ["geist"],
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

let configWithPlugins = baseConfig;

if (false) {
  configWithPlugins = withSentryConfig(configWithPlugins, {
    org: process.env.NEXT_PUBLIC_SENTRY_ORG,
    project: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
    silent: !process.env.CI,
    widenClientFileUpload: true,
    tunnelRoute: "/monitoring",
    telemetry: false,
    webpack: {
      reactComponentAnnotation: { enabled: true },
      treeshake: { removeDebugLogging: true },
    },
    sourcemaps: {
      disable: !process.env.NEXT_PUBLIC_SENTRY_ORG || !process.env.NEXT_PUBLIC_SENTRY_PROJECT,
    },
  });
}

const nextConfig = configWithPlugins;
export default nextConfig;
