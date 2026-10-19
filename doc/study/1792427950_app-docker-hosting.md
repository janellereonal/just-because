# Study: Self-hosting the Just Because application

## Prompt and scope

Make the Just Because application run as a container on a LAN host, Linux VPS, or EC2, and document setup. Keep the existing Vercel deployment path working. This is one bounded deployment change on `codex/just-because-work`; it does not provision cloud resources or migrate production data.

## Current state

The app already uses TanStack Start and Nitro, and `vite.config.ts` supports `NITRO_PRESET=node`; `CLAUDE.md` documents running `.output/server/index.mjs`. The production build currently defaults to Vercel, however. The app expects PostgreSQL (`DATABASE_URL`), Better Auth, optional Google OAuth, Resend, PayMongo, analytics, and Vercel Blob. Without Blob credentials, uploads use `.dev-uploads/`, which is local filesystem storage and needs a persistent volume. The daily billing/reminder job is currently invoked by Vercel Cron and can also be called at `/api/cron/daily` with `CRON_SECRET`.

## Feasibility and tradeoffs

A multi-stage Node container can build the existing Node Nitro output and run it without changing app architecture. Compose can add Caddy for HTTPS, map the app to a private LAN port for local use, and mount a durable upload directory. PostgreSQL can remain a managed external service (recommended for simpler backups) or be separately self-hosted; this change should not silently migrate or seed a database at container startup. A host cron entry can call the already authenticated daily endpoint.

Uploads are the main portability limitation: current local upload storage is suitable for a single app instance with a persistent disk, but not multiple replicas or ephemeral containers. Vercel Blob remains supported; a future object-storage adapter would be a separate scoped feature. External services and callback allowlists must be configured for the chosen hostname. The existing Vercel asset-cache postbuild hook is harmless for non-Vercel builds but should not be required by the container.

## Proposed implementation

Add an app-specific Dockerfile and Compose example that build the Node server, persist uploads, accept environment variables from an ignored `.env`, and provide a health check. Document LAN, VPS/Docker, EC2 security group, database, OAuth/payment webhook, scheduled job, backups, and update steps. Preserve the documentation portal's independent Compose stack and existing Vercel configuration.

## Verification

Build the Node-targeted app with the repository's documented runtime. If Docker is available, build and start the Compose service; otherwise record the limitation and verify generated container configuration and app build. Do not print or commit secrets.
