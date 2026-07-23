# SLI / SLO Baseline

> Phase: P5.1 — Operations Foundation
> Status: Baseline (adjust after 4 weeks of production data)

## SLI Definitions

### API Availability

| Field | Value |
|-------|-------|
| SLI | Proportion of HTTP requests returning 2xx/4xx vs 5xx |
| Measurement | `http_request_duration_ms` Prometheus counter, status=5xx / total |
| Exclusions | Health check endpoints (`/health`, `/ready`, `/ready/strict`, `/metrics`) |
| Window | Rolling 28 days |

### API Latency (p95)

| Field | Value |
|-------|-------|
| SLI | 95th percentile HTTP response time |
| Measurement | `http_request_duration_ms` histogram, p95 over 5 min windows |
| Exclusions | File upload endpoints (measured separately via `upload_duration_ms`) |
| Window | Rolling 28 days |

### Error Rate

| Field | Value |
|-------|-------|
| SLI | Proportion of failed business operations |
| Measurement | 5xx responses + business exceptions / total requests |
| Window | Rolling 28 days |

### Health Check Success

| Field | Value |
|-------|-------|
| SLI | Proportion of health checks where all dependencies are "up" |
| Measurement | `GET /ready/strict` returning `status: "ready"` |
| Window | Rolling 28 days |

### Outbox Processing Delay

| Field | Value |
|-------|-------|
| SLI | Time from event staged to event published |
| Measurement | `outbox_oldest_unpublished_age_ms` gauge (p99 over 5 min) |
| Window | Rolling 7 days |

### Background Job Failure

| Field | Value |
|-------|-------|
| SLI | Proportion of scheduled jobs that fail |
| Measurement | Job error count / total job invocations |
| Window | Rolling 7 days |

---

## SLO Targets

| SLI | Target | Burn Rate Window | Notes |
|-----|--------|------------------|-------|
| API availability | 99.9% | 28d | ~43 min downtime/month |
| API p95 latency | <500ms | 28d | Baseline; adjust after staging load test |
| Error rate | <1% | 28d | Business errors, not 4xx |
| Health check success | 99.9% | 28d | Readiness probe |
| Outbox processing delay | <30s (p99) | 7d | Eventual consistency guarantee |
| Background job failure | <1% | 7d | Cron / scheduled tasks |

## Error Budgets

| SLO | Error Budget (28d) | Monthly Allowance |
|-----|--------------------|-------------------|
| 99.9% | 0.1% | 43 min 12 s |
| 99.5% | 0.5% | 3 h 36 min |
| 99.0% | 1.0% | 7 h 12 min |

Burn rate alarm threshold: consume >10% error budget in 24h.

---

## Implementation Notes

- All metrics are exported via `MetricsService` (Prometheus) under `/metrics`
- Health endpoints are excluded from latency/availability SLIs to avoid alert noise
- File upload latency is tracked separately via `upload_duration_ms` histogram
- First SLO review: 4 weeks after production deployment
