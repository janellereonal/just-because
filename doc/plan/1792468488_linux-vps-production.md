# Plan: Public Just Because deployment on a Linux VPS

## OPEN QUESTIONS

- Which VPS provider/instance and public IPv4 or hostname should receive the deployment?
- Which domain/subdomain will point to the VPS, and do you control its DNS?
- The managed PostgreSQL connection URLs are still absent from `deployment/app/.env`. Add pooled `DATABASE_URL` and direct `DATABASE_URL_UNPOOLED` locally before database migration.
- Should production uploads use the configured Vercel Blob integration, or persist on the VPS volume for a single instance?

## Objective

Prepare the existing Docker app for public HTTPS hosting on a supported Linux VPS. Keep THEPC private for administration and preview. Preserve Vercel's current deployment path.

## Task board

- [x] Add Caddy to the app Compose stack for automatic HTTPS and reverse proxying; keep the app port private on production hosts.
- [x] Clarify safe bind-address defaults for private LAN preview versus public VPS deployment.
- [x] Update the deployment guide with VPS DNS, firewall, SSH hardening, TLS, secrets, managed database, uploads, cron, backup, update, and rollback steps.
- [x] Validate Compose configuration syntax and whitespace; the Docker daemon was unavailable for container-level validation.
- [ ] Leave documented server-specific values and database migration for the configured VPS release.
- [ ] Update this board with evidence and commit as a scoped Conventional Commit.

## Decisions

Use a Linux VPS with Docker Compose and Caddy; keep PostgreSQL managed. Do not open port 8080 publicly. Do not migrate production data or expose a hostname before its target, credentials, and DNS are confirmed. Provide local preview access separately from the production bind configuration.

## Completion notes

## Completion notes

- Added the `public` Compose profile with Caddy, automatic HTTPS, persistent Caddy state, and loopback-only default app port binding.
- Added documented LAN preview override and VPS setup, DNS/firewall, SSH, TLS, OAuth/PayMongo, migration, and operations guidance.
- `docker-compose -f deployment/app/compose.yaml config --quiet` and `git diff --check` passed. Docker daemon access was denied in this session, so no image rebuild or container health check was possible.
- Committed as `f8e2bed feat: prepare self-hosted app for public HTTPS`.
- Remaining for a real public release: choose VPS and domain/DNS, configure managed database credentials in the ignored `.env`, decide uploads storage, apply migrations, and validate the hostname/HTTPS in production.
