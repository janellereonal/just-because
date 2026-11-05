# Plan: Move Just Because Production to the THEPC VM (Superseded)

> **Superseded for production hosting:** AWS Lightsail is again the selected production host. Use [`the Lightsail production rollout`](1793858560_lightsail_production_rollout.md). Keep this board as the record of private THEPC preparation; do not use its public-ingress or production cutover steps.

This task board implements [`the THEPC VM hosting study`](../study/1793703225_thepc_vm_hosting.md). The owner approved the target architecture: THEPC Linux VM (4 GB RAM / 50 GB storage), Tailscale for administration, Neon PostgreSQL and Cloudflare R2 as external services, Vercel Preview as isolated staging, and Lightsail retained temporarily for rollback. Work is phased: first make the app/backend run privately on the VM; then choose and configure public ingress and front-end cutover.

## OPEN QUESTIONS / OWNER CHECKS

- [ ] Verify exact Ubuntu 26 release, CPU architecture, 4 GB RAM/50 GB storage, and Tailscale access on the VM.
- [ ] Confirm production Neon and R2 credentials/configuration are available; keep secret values in private files/provider dashboards.
- [ ] Confirm Neon backup/restore path and migration compatibility before first production migration.
- [ ] Later ingress phase: confirm Cloudflare zone access (if selecting Tunnel) and inventory Namecheap DNS records before nameserver changes.
- [ ] Provide an isolated Neon staging database and separate Preview media/auth/payment/email configuration before staging acceptance checks.

## Status

Implementation progress (2026-11-05): the old multi-platform build stalled on emulated ARM64 and was cancelled. The AMD64-only image for commit `e63b97a2f58de6aa8b21444cb522405f354c7110` built and published successfully. Over Tailscale SSH, verified the VM is `x86_64`, Docker 29.9.3 and Compose 5.7.0 are available, deployment Compose files are present, the private `.env` exists with mode 600 and required Neon/R2/auth keys non-empty (values were not displayed), and `APP_IMAGE` is pinned to the successful immutable image. The owner confirmed `sudo docker image inspect` on the VM reports `linux/amd64`, so the image is pulled and matches the VM. Compose configuration validates. The guest reports 3.3 GiB memory, a 60 GB virtual disk, and a 28 GB root filesystem with about 20 GB free. The active app branch has no Drizzle migration changes relative to `main`; production migration state and backup/restore have not been verified, so no migration was run. The user started the app with Compose; `docker compose ps` reports it healthy and bound only to `127.0.0.1:18080`. A request to the app returned HTTP 200 both on the VM loopback and through a Tailscale SSH local forward. Neon production read/write, migration, R2 operations, restart-after-reboot, public ingress, and DNS remain unverified; no production data operation has occurred.

- [x] Study the home VM target and record feasibility/tradeoffs.
- [x] Select remotely managed Cloudflare Tunnel as public ingress; no inbound router ports or public SSH.
- [x] Retain the existing Lightsail Compose profile/workflow as a rollback path.
- [x] Add the Compose Tunnel profile, keep the app unexposed on the host, and preserve Caddy for Lightsail rollback.
- [x] Update deployment and wiki guidance for the home VM, DNS delegation, secret handling, and Tunnel.
- [x] Confirm Cloudflare Free DNS/Tunnel cost is $0/month; R2 charges are separate and usage-based.
- [ ] Complete Phase 1: privately run the app/backend on THEPC and verify Neon, migration, R2 readiness, and restart-after-reboot behavior. App health is confirmed; the external-service and persistence checks remain open.
- [ ] Complete Phase 2: choose and configure public ingress, DNS, callbacks, and browser flows; keep Lightsail until validation is complete.

## Task Board

### 1. Prepare the home VM

- [x] Verify Ubuntu 26.04.1, `x86_64`, Docker 29.9.3, Compose 5.7.0, and Tailscale SSH connectivity. The guest reports 3.3 GiB RAM, a 60 GB virtual disk, and a 28 GB root filesystem with about 20 GB free.
- [ ] Ensure router and host firewall expose no inbound app or SSH ports. Administration and manual deployment use SSH over Tailscale.
- [x] Install Compose files and `compose.private.yaml` under `/opt/just-because/deployment/app`; create a private production `.env` with mode 600 and no repository copy.
- [x] Confirm required production Neon/R2/auth settings are non-empty in the VM `.env` without printing their values; the file has mode 600. Confirmed a successful immutable AMD64 image exists for the VM architecture.
- [x] Pin the successful image SHA in `.env`.
- [x] Pull the image from GHCR and confirm its local platform. Owner verified `linux/amd64` on the VM.

### 2. Run and verify app/backend privately

- [ ] Verify Neon production target and backup/restore path; review migration files against the currently running Vercel production app.
- [ ] Run the one-shot migration using `DATABASE_URL_UNPOOLED` after backup and target verification; this applies schema migrations and does not move database rows or media.
- [x] Start only the app with the loopback-only `compose.private.yaml`; `docker compose ps` reports healthy, bound to `127.0.0.1:18080`, and an HTTP request returns 200.
- [x] Establish an SSH local forward over Tailscale and verify HTTP 200 through it. Canonical OAuth, webhooks, email links, and public R2 reads still need the public hostname phase.
- [ ] Verify Neon read/write connectivity and intended schema. Verify R2 upload/read/delete once the public media hostname/bucket endpoint is available.
- [ ] Reboot the VM and confirm Docker/app restart policy restores the private app.

### 3. Configure public ingress and storage

- [ ] Select Cloudflare Tunnel or a VPS relay for public ingress; the current preferred route is Tunnel, but no public ingress is required for Phase 1.
- [ ] Add `justbecause.site` to the Cloudflare account and export/recreate every current Namecheap DNS record in the Cloudflare zone. Verify MX, SPF/DKIM/DMARC, and TXT records before delegating DNS; preserve the current Lightsail A record during this DNS-provider migration. Namecheap remains the registrar.
- [ ] At Namecheap, change the authoritative nameservers to the Cloudflare-assigned pair. This moves DNS hosting only; verify mail and existing website records still resolve before proceeding.
- [ ] Create a remotely managed Cloudflare Tunnel and add its token only to the VM's private environment.
- [ ] Configure the public hostname `justbecause.site` to forward to `http://app:8080` on the Compose network. Verify the app privately and connector health in Cloudflare before changing the app's DNS record.
- [ ] Replace the Cloudflare root A record with the Tunnel route/CNAME for `justbecause.site` only after the home app passes checks. Retain `15.135.147.111` separately for rollback. Verify public HTTPS and mail after DNS propagation.
- [ ] Route the public media hostname to the existing R2 bucket; verify the app's R2 write/delete credentials and production media URL.
- [ ] Do not expose app port 8080, public SSH, or Caddy ports on the home VM. The Caddy `public` profile remains for the Lightsail rollback deployment.

### 4. Protect data and isolate staging

- [ ] Confirm Neon production backup/recovery and review migration compatibility with the existing Vercel production app.
- [ ] Keep Vercel Preview separate: distinct Neon database, media write credentials, Better Auth secret/callback origin, test PayMongo keys, safe email, and no production cron.
- [ ] Configure production-only auth origin, email sender, PayMongo webhook, and `CRON_SECRET`; use test payment mode until release checks pass.
- [ ] Schedule the authenticated daily job on the VM after public HTTPS and cron secret are verified.

### 5. Release, validate, and operate

- [ ] Pull and start the immutable image with Compose's `tunnel` profile; confirm app and tunnel restart after VM reboot.
- [ ] Verify `https://justbecause.site` from outside the tailnet. Confirm port 8080 and SSH are not reachable from the public internet and SSH works through Tailscale.
- [ ] Smoke-test sign-in, gift create/edit, contributions, photo/thumbnail/voice/video upload and deletion, admin theme uploads, PayMongo test/webhook, email links, and daily job.
- [ ] Monitor guest memory, disk, CPU, container restarts, tunnel health, and upload behavior during expected concurrent use. The app buffers uploads up to about 50 MiB; 4 GB is a reasonable starting allocation, not a measured capacity guarantee.
- [ ] Keep Lightsail and its known-good configuration until all checks pass. Do not delete it or remove rollback DNS information as part of this plan.
- [ ] Record release evidence and sync the deployment README and hosting wiki to the verified state.

## Release Guardrails

- Build application images in GitHub Actions and deploy immutable `sha-<commit>` tags; do not build on the 4 GB VM.
- Use Tailscale for private VM administration. Keep the app private until one public ingress route is selected and verified.
- Keep Neon and R2 external. Do not place uploaded media or database data on the VM disk as the durable store.
- Never put credentials in Git, image layers, command history, documentation, or chat. Do not change Namecheap nameservers until all existing DNS records have been captured and verified for recreation in Cloudflare.
- Cloudflare's Free plan is sufficient for planned DNS and Tunnel ingress at $0/month; R2 is separate and can incur usage-based charges. Avoid enabling paid Cloudflare products without reviewing their pricing.
- Do not apply migrations until backup, target, compatibility, and image checks pass. Do not cut over production DNS until the selected ingress and app health are verified.
