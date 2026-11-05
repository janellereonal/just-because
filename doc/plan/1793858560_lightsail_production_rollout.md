# Plan: Run Just Because production on AWS Lightsail

This task board follows [`the Lightsail production re-selection study`](../study/1793858522_lightsail_production_reselection.md). The selected architecture is the existing Lightsail server as the public app host, Docker Compose for the app, and Caddy for public HTTPS/reverse proxy. Neon PostgreSQL and Cloudflare R2 remain external. Namecheap remains the registrar; Vercel Preview remains staging with isolated services. Keep THEPC private and available during the transition.

## OPEN QUESTIONS / OWNER CHECKS

- [ ] Confirm the Lightsail instance is still `just-because-prod` in Sydney (`ap-southeast-2`), on the $7 / 1 GB / 2 vCPU / 40 GB bundle, with static IPv4 `15.135.147.111` attached.
- [ ] Confirm the intended public hostname: root `justbecause.site` or a validation hostname such as `app.justbecause.site`.
- [ ] Confirm current Namecheap DNS records and the current public site destination before changing records. Preserve mail and verification records.
- [ ] Confirm the production Neon project, branch, database, and latest restorable backup/restore point. Do not paste credentials into chat.
- [ ] Confirm production R2 bucket-scoped credentials and how `media.justbecause.site` will resolve to the existing R2 bucket.
- [ ] Confirm production OAuth, email, analytics, PayMongo, and cron configuration for the chosen hostname. Keep Vercel Preview on isolated test credentials/data.

## Current evidence

- The old multi-platform image build stalled while emulating ARM64 and was cancelled. GitHub Actions published the AMD64-only immutable image for commit `e63b97a2f58de6aa8b21444cb522405f354c7110` as `ghcr.io/janellereonal/just-because:sha-e63b97a2f58de6aa8b21444cb522405f354c7110`.
- THEPC confirmed that image reports `linux/amd64`; its app was started privately and returned HTTP 200. This verifies a private test deployment only, not production database/media flows.
- The existing THEPC `.env` is private to that host and must not be copied to Lightsail. Prepare a separate Lightsail production `.env`.
- The repository contains a Compose `public` profile with Caddy. Caddy proxies `app:8080`, publishes 80/443, and keeps certificate state in named volumes.
- No current Lightsail health, firewall, DNS, Neon backup, production migration, R2, or public smoke-check evidence is recorded here.

## Task board

### 1. Verify Lightsail and network access

- [ ] Confirm instance name, AWS region, OS, architecture, plan, memory, and free disk space in Lightsail.
- [ ] Confirm static IPv4 `15.135.147.111` is attached to this instance; keep using the static IP for DNS.
- [ ] Configure Lightsail firewall: allow TCP 80 and 443 for Caddy; restrict SSH to the owner's administration IP or use Tailscale SSH. UDP 443 is optional for HTTP/3.
- [ ] Confirm the OS firewall matches the Lightsail firewall and that app port 8080 is not publicly exposed.
- [ ] Confirm Docker Engine and Compose are enabled and available after reboot.

### 2. Verify production data and configuration

- [ ] In Neon, identify the exact production project, branch, and database used by the currently live app. Compare non-secret host/database identifiers privately; never print or share connection URLs.
- [ ] Verify a recent Neon restore point and review how to restore it to a separate branch for inspection. Do not finalize a restore over production.
- [ ] Review checked-in Drizzle migrations against the production schema and the current live app version. Do not migrate if the target or backup is uncertain or a migration is destructive/incompatible.
- [ ] Prepare a Lightsail-only `.env` with the production Neon pooled runtime URL and matching unpooled migration URL, a fresh auth secret, R2 credentials, canonical app/media URLs, and required provider keys. Set mode 600.
- [ ] Keep Vercel Preview isolated: separate Neon database, media write credentials, auth secret/origin, test PayMongo keys, safe email, and no production cron.

### 3. Deploy privately and validate the backend

- [ ] Select a successful immutable GHCR image tag and verify it is `linux/amd64` for the Lightsail host.
- [ ] Install the Compose deployment files on Lightsail. Keep deployment `.env` out of Git, image layers, and shell transcripts.
- [ ] Start only the app with a loopback-only/private Compose override first; verify its health without public traffic.
- [ ] Verify Neon connectivity and current schema with the app. Create/confirm the backup before running any migration.
- [ ] Run the explicit one-shot migration using `DATABASE_URL_UNPOOLED` only if reviewed migrations are pending and the backup/target checks pass.
- [ ] Verify basic app read/write paths, then test R2 upload/read/delete against the production bucket once its public media hostname is available.

### 4. Configure DNS and Caddy HTTPS

- [ ] Inventory current Namecheap DNS records and identify the selected app hostname. If DNS is moved to Cloudflare for the R2 custom domain, recreate and verify all MX, SPF, DKIM, DMARC, and TXT records before changing nameservers; otherwise leave DNS at Namecheap.
- [ ] Point the selected app hostname's A record to Lightsail static IPv4 `15.135.147.111` only when ready to validate that hostname. Keep the current public site record intact until cutover is intended.
- [ ] Confirm inbound TCP 80 and 443 reach Lightsail and Docker; do not expose port 8080.
- [ ] Start the app and Caddy using the Compose `public` profile, with `APP_DOMAIN` set to the exact hostname. Confirm Caddy obtains a certificate and redirects/serves HTTPS.
- [ ] Verify the Caddy volumes persist across container replacement/reboot and the app remains private behind Caddy.
- [ ] Configure `media.justbecause.site` for the existing R2 bucket and verify HTTPS media reads. This may require Cloudflare authoritative DNS for R2 custom-domain routing; it is independent from the app's Caddy ingress.

### 5. Cut over and operate

- [ ] Verify canonical Better Auth URLs and Google OAuth callbacks, PayMongo test webhook/callbacks, email links, `CRON_SECRET`, and production sender configuration for the public hostname.
- [ ] Smoke-test sign-in, gift creation/edit, contributions, all media upload/read/delete flows, theme uploads, payment test flow/webhook, email links, and daily job.
- [ ] Confirm public HTTPS works while port 8080 is unreachable from the internet; verify SSH remains restricted.
- [ ] Monitor RAM, swap, disk, CPU, container restarts, and upload behavior on the 1 GB plan. Resize to 2 GB or higher if metrics show pressure.
- [ ] Keep Vercel and THEPC available during validation; retain the previous immutable app image for rollback.
- [ ] Record verified release state and update `deployment/app/README.md` and the hosting wiki to reflect the actual Lightsail configuration.

## Release guardrails

- Build images in GitHub Actions and deploy immutable `sha-<commit>` tags; do not compile on the 1 GB Lightsail host.
- Use Caddy on Lightsail for automatic HTTPS and reverse proxying. Keep the app's internal port 8080 private.
- Keep Neon and R2 external; VM-local storage is not the durable database or media store.
- Never put credentials in Git, image layers, documentation, command arguments, or chat. Never replace DNS records until the current zone has been inventoried and the cutover is intended.
- Do not apply production migrations until the production target, restorable backup, image, and migration compatibility are confirmed.
- Keep THEPC's tunnel configuration separate; Cloudflare Tunnel is not required for this direct Lightsail ingress path.
