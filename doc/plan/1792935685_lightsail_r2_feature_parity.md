# Plan: Lightsail deployment, R2 uploads, and feature parity

## Objective

Deploy the existing Just Because application on an affordable public Linux VPS while preserving the current Vercel deployment, managed PostgreSQL, and app behavior. Make uploaded media durable and portable across both runtimes.

## Task board

- [ ] Add a shared media-storage boundary with Vercel Blob and Cloudflare R2 implementations. Keep local disk as a development-only adapter.
- [ ] Implement authenticated, short-lived R2 upload authorization and direct browser uploads; preserve current media type, size, ownership, and key-prefix checks.
- [ ] Update media URL parsing, ownership validation, CSP, privacy copy, and deletion/listing so Vercel Blob and R2 URLs continue to work, including existing records.
- [ ] Add focused adapter, authorization, URL validation, and deletion tests; verify the existing upload flows for photo/thumb, voice, video, calendar, intro, and admin theme media.
- [ ] Configure R2 bucket CORS and public custom-domain delivery through `media.<domain>`; document secrets, CORS, public access, and cost thresholds without committing credentials.
- [ ] Add CI image build/publish for Linux/amd64 and deploy by immutable image reference to Lightsail. Keep migrations an explicit one-shot release step and Caddy as public HTTPS ingress.
- [ ] Document Lightsail Singapore 2 GB ($12/month), firewall/SSH hardening, alerts, update/rollback, and 4 GB scale-up criteria.
- [ ] Schedule `/api/cron/daily` on the host with `CRON_SECRET`; configure auth origins, email, analytics, Google OAuth, and PayMongo callback values for production.
- [ ] Verify Vercel and VPS builds use the same schema and can read/delete media created by either provider. Perform route-level smoke checks for sign-in, gifts, contributions, admin, payments, email links, and scheduled jobs.
- [ ] Update living deployment documentation, review `git diff --check`, run the requested lint/tests/build, and record results.

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
