# BTN HRMS

Enterprise Human Resource Management System (HRMS) for single-tenant development stage.

## Tech Stack
- **Frontend**: Next.js (App Router), Zustand, TanStack Query, TanStack Form.
- **Backend**: NestJS, Drizzle ORM, PostgreSQL.
- **Infrastructure**: Redis, MinIO (S3-compatible storage), Caddy (reverse proxy with HTTPS), Cloudflare Tunnel.

## Monorepo Structure
- `backend`: NestJS backend.
- `frontend`: Next.js frontend.
- `packages/eslint-config`: Shared ESLint configurations.

## Development Setup

### 1. Prerequisites
- Node.js v22
- pnpm v11
- Docker & Docker Compose (for local database & storage infra)

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Start Infrastructure
Run PostgreSQL, Redis, and MinIO locally:
```bash
docker compose -f docker-compose.infra.yml up -d
```

### 4. Setup Local Development Certificates
```bash
pnpm setup:dev-certs
```

### 5. Run Application
Start NestJS backend and Next.js frontend concurrently in development mode:
```bash
pnpm dev
```
- API (Direct HTTP): `http://localhost:3001/api/v1`
- Web (Direct HTTP): `http://localhost:8080`

### 6. Run Production Simulation (Docker Compose)
Run the application in production mode locally using Docker:
```bash
docker compose up -d
```
- API Container: `http://localhost:3002/api/v1`
- Web Container: `http://localhost:3456`
- HTTPS Proxy (Caddy): `https://localhost` (Requires dev certificates set up)

## Deployment

The project uses GitHub Actions for CI/CD:
1. **CI**: Lint, test, typecheck, build, and run security scan (Trivy).
2. **Build**: Packages Docker images (`btn-hrms-api` and `btn-hrms-web`) and pushes them to GHCR.
3. **CD**: Deploy on production VPS using a self-hosted runner. Copies necessary compose configuration files to the VPS directory and deploys containers.
