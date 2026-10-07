#!/usr/bin/env node
import { execSync } from 'node:child_process';

const COMPOSE_FILE = 'docker-compose.infra.yml';

try {
  const status = execSync('docker inspect --format "{{.State.Status}}" btn-hrms-postgres 2>/dev/null', {
    stdio: ['pipe', 'pipe', 'ignore'],
  }).toString().trim();

  if (status === 'running') {
    // Already running, 0ms overhead!
    process.exit(0);
  }
} catch {
  // Container not found or stopped
}

console.log('🚀 [Docker Infra] Khởi động Postgres, MinIO, Redis, GlitchTip...');
try {
  execSync(`docker compose -f ${COMPOSE_FILE} start`, { stdio: 'inherit' });
} catch {
  execSync(`docker compose -f ${COMPOSE_FILE} up -d --no-build`, { stdio: 'inherit' });
}

// Wait for Postgres to be ready
let retries = 15;
while (retries > 0) {
  try {
    execSync('docker exec btn-hrms-postgres pg_isready -U hrms -d hrms', { stdio: 'ignore' });
    console.log('✅ [Docker Infra] Cơ sở dữ liệu đã sẵn sàng!');
    break;
  } catch {
    retries--;
    execSync('sleep 1');
  }
}
