import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
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
  allowedDevOrigins: [
    '10.8.1.84',
    '10.10.3.100',
    '10.10.3.231',
    'server2',
    'server2:8080',
    'server2:3000',
    ...(process.env.ALLOWED_DEV_ORIGINS
      ? process.env.ALLOWED_DEV_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
      : []),
  ],
  experimental: {
    cpus: process.env.NEXT_CPUS
      ? Number(process.env.NEXT_CPUS)
      : Math.max(1, os.cpus().length - 1),
    optimizePackageImports: [
      '@tabler/icons-react',
      'date-fns',
      'recharts',
    ],
  },
  turbopack: {
    root: path.resolve(__dirname, '../../'),
  },
  async rewrites() {
    const backendUrl = (() => {
      const internal = process.env.INTERNAL_API_URL?.replace(/\/+$/, '');
      if (internal) return internal;
      const publicBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');
      if (publicBase && (publicBase.startsWith('http://') || publicBase.startsWith('https://'))) {
        try {
          return new URL(publicBase).origin;
        } catch {
          // fallback below
        }
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');
      if (apiUrl && (apiUrl.startsWith('http://') || apiUrl.startsWith('https://'))) {
        return apiUrl;
      }
      return 'http://127.0.0.1:3001';
    })();

    const rewrites: Array<{source:string;destination:string}> = [
      {
        source: "/files/:path*",
        destination: `${backendUrl}/files/:path*`,
      },
      {
        source: "/public/:path*",
        destination: `${backendUrl}/public/:path*`,
      },
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];

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

if (Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN)) {
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
