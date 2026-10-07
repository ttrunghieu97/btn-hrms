/**
 * CSP violation report endpoint (report-only mode).
 * - Validates payload schema (csp-report format only)
 * - Limits body size (5kb)
 * - Rate limits (100 req/min per IP)
 * - Extracts only relevant fields before forwarding to Sentry
 * - Returns 200 immediately (CSP spec: browser expects success)
 */
import { type NextRequest, NextResponse } from 'next/server';
import { reportWarning } from '@/lib/observability/reporter';

// --- Rate limiter (in-memory, per-IP sliding window) ---------------------

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 100;

const ipHits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// --- Size limit ----------------------------------------------------------

const MAX_BODY_BYTES = 5120; // 5kb

async function readSafeText(request: NextRequest): Promise<string | null> {
  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > MAX_BODY_BYTES) return null;

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return null;
  return text;
}

// --- Schema validation ---------------------------------------------------

interface CspReportPayload {
  'csp-report': {
    'document-uri'?: string;
    'referrer'?: string;
    'blocked-uri'?: string;
    'violated-directive'?: string;
    'effective-directive'?: string;
    'original-policy'?: string;
    'disposition'?: string;
    'script-sample'?: string;
    'status-code'?: number;
    'source-file'?: string;
    'line-number'?: number;
    'column-number'?: number;
  };
}

/** Fields forwarded to Sentry — only what's useful for analysis. */
interface SanitizedReport {
  'violated-directive': string;
  'effective-directive'?: string;
  'blocked-uri': string;
  'document-uri': string;
  'line-number'?: number;
  'column-number'?: number;
}

function validateCspReport(raw: unknown): SanitizedReport | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as CspReportPayload;
  const r = p['csp-report'];
  if (!r || typeof r !== 'object') return null;
  if (!r['violated-directive'] || !r['blocked-uri'] || !r['document-uri']) return null;

  return {
    'violated-directive': r['violated-directive'],
    'effective-directive': r['effective-directive'],
    'blocked-uri': r['blocked-uri'],
    'document-uri': r['document-uri'],
    'line-number': r['line-number'],
    'column-number': r['column-number'],
  };
}

// --- Handler -------------------------------------------------------------

export async function POST(request: NextRequest) {
  // 1. Rate limit
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ status: 'ok' });
  }

  // 2. Size limit
  const raw = await readSafeText(request);
  if (!raw) {
    return NextResponse.json({ status: 'ok' });
  }

  // 3. Parse + validate
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ status: 'ok' });
  }

  const report = validateCspReport(parsed);

  // 4. Log locally
  // eslint-disable-next-line no-console
  console.warn('[CSP-Report]', report ?? 'invalid-payload');

  // 5. Forward sanitized fields to Sentry
  if (report) {
    try {
      reportWarning('CSP violation', {
        severity: 'low',
        tags: {
          source: 'csp-report',
          violated_directive: report['violated-directive'],
          blocked_uri: report['blocked-uri']?.slice(0, 200),
        },
        extra: report as unknown as Record<string, unknown>,
      });
    } catch {
      // reporter unavailable — skip
    }
  }

  return NextResponse.json({ status: 'ok' });
}

// Note: ipHits map is never cleared — entries are small (one per unique IP)
// and the server resets on deploy. Not worth complexity for report-only CSP.
