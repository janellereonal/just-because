# Plan: Move Just Because Production to the THEPC VM

This task board implements [`the THEPC VM hosting study`](../study/1793703225_thepc_vm_hosting.md). The owner approved the target architecture: THEPC Linux VM (4 GB RAM / 50 GB storage), Cloudflare Tunnel for public ingress, Tailscale for administration, Neon PostgreSQL and Cloudflare R2 as external services, Vercel Preview as isolated staging, and Lightsail retained temporarily for rollback.

## OPEN QUESTIONS / OWNER CHECKS

- [ ] Confirm the VM is Ubuntu 24.04 (or record the installed Linux distribution) and joins the existing Tailscale network.
- [ ] Confirm the Cloudflare account can add `justbecause.site`; inventory Namecheap DNS records, especially MX/TXT records, before changing nameservers.
- [ ] Verify an R2 bucket and production credentials are available; keep all secret values in private files/provider dashboards.
- [ ] Provide an isolated Neon staging database and separate Preview media/auth/payment/email configuration before staging acceptance checks.

## Status

- [x] Study the home VM target and record feasibility/tradeoffs.
- [x] Select remotely managed Cloudflare Tunnel as public ingress; no inbound router ports or public SSH.
- [x] Retain the existing Lightsail Compose profile/workflow as a rollback path.
- [ ] Complete the deployment configuration and documentation changes below.
- [ ] Configure and validate the VM, tunnel, app settings, and integrations.
- [ ] Cut over DNS only after the app is healthy; complete parity checks and keep Lightsail until validation is complete.

## Task Board

### 1. Prepare the home VM

- [ ] Verify Linux version, 4 GB RAM, 50 GB disk, persistent boot, internet egress, Docker Engine/Compose, and Tailscale connectivity.
- [ ] Ensure router and host firewall expose no inbound app or SSH ports. Administration and manual deployment use SSH over Tailscale.
- [ ] Install the Compose files under `/opt/just-because/deployment/app`; create a private production `.env` with correct permissions and no repository copy.
- [ ] Confirm the production database target, private GHCR pull access (or public package), and an immutable `sha-<commit>` image built by GitHub Actions.

### 2. Configure public ingress and storage

- [ ] Create a remotely managed Cloudflare Tunnel and add its token only to the VM's private environment.
- [ ] Configure the public hostname `justbecause.site` to forward to `http://app:8080` on the Compose network; start the `tunnel` profile and confirm tunnel health before DNS cutover.
- [ ] Add `justbecause.site` to Cloudflare and migrate authoritative DNS from Namecheap only after copying/recreating and checking all existing records. Keep Namecheap as registrar.
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
- Do not apply migrations or cut over production DNS until backups, image health, app configuration, and tunnel routing are verified.
