import { type NextRequest } from 'next/server';
import { buildBackendUrl, createForwardHeaders, proxyJsonResponse } from '@/lib/server/backend-proxy';

export async function POST(request: NextRequest) {
  const headers = createForwardHeaders(request, {
    'content-type': 'application/json'
  });

  const response = await fetch(buildBackendUrl('/auth/refresh'), {
    method: 'POST',
    headers,
    body: '{}',
    cache: 'no-store'
  });

  return proxyJsonResponse(response);
}
