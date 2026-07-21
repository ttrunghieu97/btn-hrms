# Web App

Next.js admin web app for BTN HRMS.

## Run

```bash
pnpm install
pnpm dev
```

Default local URL: `http://localhost:8080`

## Environment

Frontend stage is derived from Next.js `NODE_ENV` only:

- `development` => app `dev`
- `production` => app `prod`

Attendance image upload fallback follows that stage automatically:

- `development`: allowed
- `production`: blocked

No extra frontend stage flag or attendance upload flag is required.

## Commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm format
```

## Notes

- Source code is in `src/`
- Static assets are in `public/`
- This folder was originally based on an admin starter template and has been trimmed for project use
