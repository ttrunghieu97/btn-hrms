/**
 * Creates an isolated MSW server for a single test suite.
 * MSW is lazily imported to avoid ESM transform conflicts with next/jest.
 *
 * Usage:
 *   import { createTestServer } from '@/test/msw/test-server';
 *   const server = createTestServer(handlers);
 *   beforeAll(() => server.listen());
 *   afterEach(() => server.resetHandlers());
 *   afterAll(() => server.close());
 */

let setupServerFn: typeof import('msw/node')['setupServer'] | null = null;

async function getSetupServer() {
  if (!setupServerFn) {
    const mswNode = await import('msw/node');
    setupServerFn = mswNode.setupServer;
  }
  return setupServerFn;
}

export async function createTestServer(...handlers: any[]) {
  const setupServer = await getSetupServer();
  return setupServer(...handlers);
}
