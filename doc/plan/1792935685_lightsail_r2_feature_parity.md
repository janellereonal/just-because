# Plan: Lightsail deployment, R2 uploads, and feature parity

> **Superseded for rollout:** The owner provisioned the $7 / 1 GB instance in Sydney (`ap-southeast-2`). Use [the Sydney rollout task board](1793613224_lightsail_sydney_1gb_rollout.md) for current deployment steps and sizing. This file preserves the original architecture decisions and completed implementation record.

## Objective

Deploy the existing Just Because application on an affordable public Linux VPS while preserving the current Vercel deployment, managed PostgreSQL, and app behavior. Make uploaded media durable and portable across both runtimes.

## Task board

- [x] Add R2 upload and deletion support while retaining the Vercel Blob path. Local disk remains the development fallback.
- [x] Enforce upload permissions, actual request/file size, and allowed content types before forwarding to R2. R2 S3 presigned PUT has no documented size-range condition, so uploads go through the app endpoint rather than directly from the browser to R2.
- [x] Update media URL validation, gift ownership checks, CSP, privacy copy, and media cleanup to accept the configured R2 hostname while retaining legacy Vercel Blob URLs.
- [x] Add R2 URL ownership regression coverage. Full provider/API upload and deletion tests remain unverified because Bun is unavailable in the workspace.
- [x] Document R2 hostname, scoped credentials, managed public custom-domain delivery, and configuration requirements without committing credentials. Browser uploads go through the app, so bucket CORS is not required for upload.
- [x] Add CI image build/publish and manual immutable-image Lightsail deployment workflows; database migration is an explicit opt-in deployment input and app host builds are disabled.
- [x] Document Lightsail Singapore starter sizing, SSH/firewall setup, update/rollback, and Vercel coexistence.
- [x] Retain and document the authenticated VPS daily endpoint schedule and production auth/email/analytics/payment configuration points.
- [ ] Perform cloud setup and cross-provider route smoke checks after owner provisions Lightsail/R2 credentials, DNS, and app secrets.
- [x] Update deployment documentation and review `git diff --check`. `bun run lint`, `bun test src`, `bun run build`, and Docker image/health verification could not run: Bun is absent and the local Docker daemon is stopped.

## Implementation notes

- The R2 S3 SigV4 client uses Node's built-in crypto and fetch APIs, so no package dependency or lockfile update is needed.
- Image tags are `sha-<commit>` and the deploy workflow has a separate `run_migrations` input.
- Runtime R2 secrets are read from `.env`; only the public media hostname and provider selection are baked into the frontend build.
- Remaining rollout work: set GitHub Actions host/SSH secrets, make GHCR package public or add authenticated pulls, configure the R2 bucket/custom domain and CORS, add the same R2 public hostname and credentials to Vercel for shared-record visibility/deletion, and test real app flows.

## Decisions

- App host: AWS Lightsail Linux, Singapore, public IPv4, 2 GB / 2 vCPU / 60 GB starting bundle. Keep the managed PostgreSQL database external.
- Media: Cloudflare R2 Standard with a Cloudflare-managed custom media hostname. R2's monthly included tier is 10 GB-month, 1M Class A, and 10M Class B operations; egress is free.
- Vercel remains supported and continues using Vercel Blob by default. Shared application code accepts and deletes both provider URL families so the existing database remains usable across deployments.
- Build container images in CI, not on Lightsail. Use a protected deploy credential and immutable image tag; never copy `.env` into the image or repository.
- No automatic production migration, DNS cutover, payment live-mode change, or cloud resource creation is part of code implementation. A real public release requires the owner to configure provider accounts, domain DNS, and secrets.

## Acceptance criteria

- CI produces a bootable image and the Compose app/Caddy health checks pass on the 2 GB target.
- R2 upload URLs are short lived and scoped; invalid users, MIME types, sizes, keys, and origins are rejected.
- App flows accept legacy Blob URLs and R2 media URLs, preserve photo thumbnails and audio/video playback, and delete related objects safely.
- Vercel's production adapter remains Blob-backed; self-hosted production requires R2 configuration and cannot silently persist user uploads to the container filesystem.
- Vercel Cron and the documented VPS scheduler both invoke the same authenticated daily endpoint.
- Required checks and manual release smoke checks are recorded before deployment.
