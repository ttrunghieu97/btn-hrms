#!/usr/bin/env node
import { execSync } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

const PORTS = [8080, 3001];
console.log('🧹 Checking and clearing ports:', PORTS.join(', '));

for (const port of PORTS) {
  try {
    // Kill only TCP listeners (server processes), not client connections (browser tabs)
    const pids = execSync(`ss -tlnp "sport = :${port}" 2>/dev/null | grep -oP 'pid=\\K\\d+'`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim().split('\n').filter(Boolean);
    for (const pid of [...new Set(pids)]) {
      console.log(`  killing server on port ${port} (PID ${pid})`);
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
    }
  } catch {
    // nothing on this port
  }
}

await sleep(1000); // wait for OS to fully release
