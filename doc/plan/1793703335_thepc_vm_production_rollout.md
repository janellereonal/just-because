# Plan: Move Just Because Production to the THEPC VM

This task board implements [`the THEPC VM hosting study`](../study/1793703225_thepc_vm_hosting.md). The owner approved the target architecture: THEPC Linux VM (4 GB RAM / 50 GB storage), Cloudflare Tunnel for public ingress, Tailscale for administration, Neon PostgreSQL and Cloudflare R2 as external services, Vercel Preview as isolated staging, and Lightsail retained temporarily for rollback.

## OPEN QUESTIONS / OWNER CHECKS

- [ ] Confirm the VM is Ubuntu 24.04 (or record the installed Linux distribution) and joins the existing Tailscale network.
- [ ] Confirm the Cloudflare account can add `justbecause.site`; export/inventory Namecheap DNS records, especially MX, SPF/DKIM/DMARC, and TXT records, before changing nameservers.
- [ ] Verify an R2 bucket and production credentials are available; keep all secret values in private files/provider dashboards.
- [ ] Provide an isolated Neon staging database and separate Preview media/auth/payment/email configuration before staging acceptance checks.

## Status

Implementation progress (2026-11-04): repository configuration and guidance for the Tunnel-based home target are prepared. Local Compose validation could not run because this workstation has no Docker Compose plugin; the wiki build could not run because Node.js is unavailable. No changes have been made to the VM, Cloudflare account, Namecheap DNS, Neon, R2, or production app settings.

- [x] Study the home VM target and record feasibility/tradeoffs.
- [x] Select remotely managed Cloudflare Tunnel as public ingress; no inbound router ports or public SSH.
- [x] Retain the existing Lightsail Compose profile/workflow as a rollback path.
- [x] Add the Compose Tunnel profile, keep the app unexposed on the host, and preserve Caddy for Lightsail rollback.
- [x] Update deployment and wiki guidance for the home VM, DNS delegation, secret handling, and Tunnel.
- [x] Confirm Cloudflare Free DNS/Tunnel cost is $0/month; R2 charges are separate and usage-based.
- [ ] Configure and validate the VM, tunnel, app settings, and integrations.
- [ ] Cut over DNS only after the app is healthy; complete parity checks and keep Lightsail until validation is complete.

## Task Board

### 1. Prepare the home VM

- [ ] Verify Linux version, 4 GB RAM, 50 GB disk, persistent boot, internet egress, Docker Engine/Compose, and Tailscale connectivity.
- [ ] Ensure router and host firewall expose no inbound app or SSH ports. Administration and manual deployment use SSH over Tailscale.
- [ ] Install the Compose files under `/opt/just-because/deployment/app`; create a private production `.env` with correct permissions and no repository copy.
- [ ] Confirm the production database target, private GHCR pull access (or public package), and an immutable `sha-<commit>` image built by GitHub Actions.

### 2. Configure public ingress and storage

- [ ] Add `justbecause.site` to the Cloudflare account and export/recreate every current Namecheap DNS record in the Cloudflare zone. Verify MX, SPF/DKIM/DMARC, and TXT records before delegating DNS; preserve the current Lightsail A record during this DNS-provider migration. Namecheap remains the registrar.
- [ ] At Namecheap, change the authoritative nameservers to the Cloudflare-assigned pair. This moves DNS hosting only; verify mail and existing website records still resolve before proceeding.
- [ ] Create a remotely managed Cloudflare Tunnel and add its token only to the VM's private environment.
- [ ] Configure the public hostname `justbecause.site` to forward to `http://app:8080` on the Compose network. Verify the app privately and connector health in Cloudflare before changing the app's DNS record.
- [ ] Replace the Cloudflare root A record with the Tunnel route/CNAME for `justbecause.site` only after the home app passes checks. Retain `15.135.147.111` separately for rollback. Verify public HTTPS and mail after DNS propagation.
- [ ] Route the public media hostname to the existing R2 bucket; verify the app's R2 write/delete credentials and production media URL.
- [ ] Do not expose app port 8080, public SSH, or Caddy ports on the home VM. The Caddy `public` profile remains for the Lightsail rollback deployment.

### 3. Protect data and isolate staging

- [ ] Confirm Neon production backup/recovery and review migration compatibility with the existing Vercel production app.
- [ ] Apply production migrations deliberately only after backup and target verification.
- [ ] Keep Vercel Preview separate: distinct Neon database, media write credentials, Better Auth secret/callback origin, test PayMongo keys, safe email, and no production cron.
- [ ] Configure production-only auth origin, email sender, PayMongo webhook, and `CRON_SECRET`; use test payment mode until release checks pass.
- [ ] Schedule the authenticated daily job on the VM after public HTTPS and cron secret are verified.

### 4. Release, validate, and operate

- [ ] Pull and start the immutable image with Compose's `tunnel` profile; confirm app and tunnel restart after VM reboot.
- [ ] Verify `https://justbecause.site` from outside the tailnet. Confirm port 8080 and SSH are not reachable from the public internet and SSH works through Tailscale.
- [ ] Smoke-test sign-in, gift create/edit, contributions, photo/thumbnail/voice/video upload and deletion, admin theme uploads, PayMongo test/webhook, email links, and daily job.
- [ ] Monitor guest memory, disk, CPU, container restarts, tunnel health, and upload behavior during expected concurrent use. The app buffers uploads up to about 50 MiB; 4 GB is a reasonable starting allocation, not a measured capacity guarantee.
- [ ] Keep Lightsail and its known-good configuration until all checks pass. Do not delete it or remove rollback DNS information as part of this plan.
- [ ] Record release evidence and sync the deployment README and hosting wiki to the verified state.

## Release Guardrails

- Build application images in GitHub Actions and deploy immutable `sha-<commit>` tags; do not build on the 4 GB VM.
- Use Tailscale for private VM administration. Cloudflare Tunnel is outbound-only and is the sole public ingress path.
- Keep Neon and R2 external. Do not place uploaded media or database data on the VM disk as the durable store.
- Never put credentials in Git, image layers, command history, documentation, or chat. Do not change Namecheap nameservers until all existing DNS records have been captured and verified for recreation in Cloudflare.
- Cloudflare's Free plan is sufficient for planned DNS and Tunnel ingress at $0/month; R2 is separate and can incur usage-based charges. Avoid enabling paid Cloudflare products without reviewing their pricing.
- Do not apply migrations or cut over production DNS until backups, image health, app configuration, and tunnel routing are verified.
