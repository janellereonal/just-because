# Plan: Move Just Because Production to the THEPC VM

This task board implements [`the THEPC VM hosting study`](../study/1793703225_thepc_vm_hosting.md). The owner approved the target architecture: THEPC Linux VM (4 GB RAM / 50 GB storage), Tailscale for administration, Neon PostgreSQL and Cloudflare R2 as external services, Vercel Preview as isolated staging, and Lightsail retained temporarily for rollback. Work is phased: first make the app/backend run privately on the VM; then choose and configure public ingress and front-end cutover.

## OPEN QUESTIONS / OWNER CHECKS

- [ ] Verify exact Ubuntu 26 release, CPU architecture, 4 GB RAM/50 GB storage, and Tailscale access on the VM.
- [ ] Confirm production Neon and R2 credentials/configuration are available; keep secret values in private files/provider dashboards.
- [ ] Confirm Neon backup/restore path and migration compatibility before first production migration.
- [ ] Later ingress phase: confirm Cloudflare zone access (if selecting Tunnel) and inventory Namecheap DNS records before nameserver changes.
- [ ] Provide an isolated Neon staging database and separate Preview media/auth/payment/email configuration before staging acceptance checks.

## Status

Implementation progress (2026-11-04): app Dockerfile, Compose app/migration services, optional Tunnel profile, local/private loopback Compose overrides, R2 adapter, and GHCR workflow are prepared. Compose configuration validated on the Mac and a temporary ARM64 image returned HTTP 200 with dummy database settings; the container was removed afterward. User reports Ubuntu 26 is installed on the VM, but exact OS patch, architecture, VM Docker readiness, production secrets, and external backend have not been verified here. No VM, production Neon/R2, Cloudflare, Namecheap DNS, or live app configuration has been changed.

- [x] Study the home VM target and record feasibility/tradeoffs.
- [x] Select remotely managed Cloudflare Tunnel as public ingress; no inbound router ports or public SSH.
- [x] Retain the existing Lightsail Compose profile/workflow as a rollback path.
- [x] Add the Compose Tunnel profile, keep the app unexposed on the host, and preserve Caddy for Lightsail rollback.
- [x] Update deployment and wiki guidance for the home VM, DNS delegation, secret handling, and Tunnel.
- [x] Confirm Cloudflare Free DNS/Tunnel cost is $0/month; R2 charges are separate and usage-based.
- [ ] Complete Phase 1: privately run the app/backend on THEPC and verify Neon, migration, R2 readiness, and container health.
- [ ] Complete Phase 2: choose and configure public ingress, DNS, callbacks, and browser flows; keep Lightsail until validation is complete.

## Task Board

### 1. Prepare the home VM

- [ ] Verify exact Ubuntu 26 release, CPU architecture, 4 GB RAM, 50 GB disk, persistent boot, internet egress, Docker Engine/Compose, and Tailscale connectivity.
- [ ] Ensure router and host firewall expose no inbound app or SSH ports. Administration and manual deployment use SSH over Tailscale.
- [ ] Install Compose files and `compose.private.yaml` under `/opt/just-because/deployment/app`; create a private production `.env` with mode 600 and no repository copy.
- [ ] Confirm production Neon pooled/unpooled URLs, production R2 config, private GHCR pull access (or public package), and an immutable image whose architecture matches the VM.

### 2. Run and verify app/backend privately

- [ ] Verify Neon production target and backup/restore path; review migration files against the currently running Vercel production app.
- [ ] Run the one-shot migration using `DATABASE_URL_UNPOOLED` after backup and target verification; this applies schema migrations and does not move database rows or media.
- [ ] Start only the app with the loopback-only `compose.private.yaml`; verify container health and app boot without exposing a LAN/public port.
- [ ] Use an SSH local forward over Tailscale to inspect the private site where useful; record that canonical OAuth, webhooks, email links, and public R2 reads still need the public hostname phase.
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
