# Prepare the app backend on THEPC

This runbook separates **private app/backend preparation** from the later **public ingress and front-end cutover**. The immediate target is the Linux VM on THEPC (owner-reported 4 GB RAM and 50 GB storage; user reports Ubuntu 26 installed). Docker Compose runs the Node/Nitro app. Neon PostgreSQL and Cloudflare R2 remain external; the VM disk is for Ubuntu, Docker image layers, and logs. Namecheap remains the domain registrar. Cloudflare Tunnel or a VPS relay can be chosen later; neither is required to install and start the app privately.

The prior repository work already prepared the multi-stage app Dockerfile, Compose app and migration services, local Compose configuration, R2 storage adapter, Tunnel profile, GHCR image workflow, and hosting/rollout docs. A local ARM64 image was built on the Mac and returned HTTP 200 with dummy database settings; it was removed afterward. This does **not** mean the VM image, production credentials, database migration, or deployment have been verified.

The app code is based on the current local `main` commit. Self-hosted image builds select R2 uploads; Vercel continues to use its Blob upload path. The API honors `MEDIA_STORAGE_PROVIDER=r2` even if an old Blob token is present, so provider selection stays consistent during migration.

## Phase 1: prepare and verify the backend privately

### 1. Verify VM prerequisites

Connect over the VM's private administration method (Tailscale SSH if available) and record:

```sh
lsb_release -ds
uname -m
free -h
df -h /
docker --version
docker compose version
sudo systemctl is-enabled docker
```

Ubuntu 26.04 LTS is supported by the current [Docker Engine Ubuntu installation guide](https://docs.docker.com/engine/install/ubuntu/). If Docker or Compose is missing, follow that official guide and install `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin`, and `docker-compose-plugin`; verify with `sudo docker run hello-world`. Do not install an unrelated Node runtime on the VM: the app image contains its runtime. Use SSH over Tailscale for administration, and do not add public router or host firewall rules for SSH or app traffic.

The local Mac image previously built as `linux/arm64`. Do not deploy that local image unless `uname -m` reports `aarch64`. GitHub Actions publishes immutable `linux/amd64` and `linux/arm64` variants from the repository source; Docker selects the matching platform when pulling the image.

### 2. Prepare files and production backend configuration

Check out the approved app commit on an admin machine and copy `compose.yaml`, `compose.private.yaml`, and `.env.example` into `/opt/just-because/deployment/app` on the VM. Do not copy a developer `.env`, local database, or build output. On the VM:

```sh
sudo mkdir -p /opt/just-because/deployment/app
sudo chown -R "$USER":"$USER" /opt/just-because
cd /opt/just-because/deployment/app
cp .env.example .env
chmod 600 .env
```

Edit `.env` on the VM using a trusted editor. Populate the production `DATABASE_URL` (runtime Neon pooled connection) and `DATABASE_URL_UNPOOLED` (migration connection), a unique `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://justbecause.site`, and `APP_BASE_URL=https://justbecause.site`. Set production R2 values (`MEDIA_STORAGE_PROVIDER=r2`, account ID, bucket, bucket-scoped access key/secret, and `R2_PUBLIC_URL=https://media.justbecause.site`). Keep `CRON_SECRET`, Google OAuth, Resend, and PayMongo values empty until those integrations are ready. Never paste values into chat, commit `.env`, or put secrets in command arguments/history.

#### Manual environment settings

All secret values are entered manually in the VM's private `.env` (or in the corresponding provider's secret store). The repository contains only empty placeholders in `.env.example`.

| Variable(s) | Needed when | Notes |
| --- | --- | --- |
| `DATABASE_URL` | App starts | Neon pooled/runtime connection string. |
| `DATABASE_URL_UNPOOLED` | Applying migrations | Neon direct/unpooled connection; migrations prefer it. |
| `BETTER_AUTH_SECRET` | App starts | Generate a unique, stable secret for this deployment. |
| `BETTER_AUTH_URL`, `APP_BASE_URL` | App starts | Canonical production origin; set to `https://justbecause.site`. |
| `MEDIA_STORAGE_PROVIDER=r2`, `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL` | Self-hosted uploads | Use a bucket-scoped credential; public URL is `https://media.justbecause.site`. Keep legacy `BLOB_READ_WRITE_TOKEN` blank on THEPC. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in enabled | Register production callback/origin after public HTTPS is configured. |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | App email enabled | Use a verified sender/domain. |
| `PAYMONGO_SECRET_KEY`, `PAYMONGO_PUBLIC_KEY`, `PAYMONGO_WEBHOOK_SECRET` | Payments enabled | Start with test-mode credentials; configure webhook only after HTTPS is live. |
| `CRON_SECRET` | Daily reconciliation job | Generate separately; schedule the endpoint only after public HTTPS is ready. |
| `CONCIERGE_EMAIL` | Admin/concierge notifications | Set to the intended operations email if this feature is used. |
| `TUNNEL_TOKEN` | Phase 2, Cloudflare Tunnel chosen | Store only on the VM. It is not needed for Phase 1. |

`VITE_POSTHOG_KEY`, `VITE_POSTHOG_REGION`, and `R2_PUBLIC_URL` are image build configuration. For CI builds, set GitHub Actions repository **Variables** for those build values; they are not runtime secrets. Keep tokens, passwords, and signing keys out of GitHub Variables, Docker build arguments, and image layers. Vercel Preview gets its own isolated environment in the Vercel project settings.

Neon is the existing database; this deployment does not move database contents. R2 is the durable media store; uploads should not accumulate on the VM disk. The app can start without R2, but upload flows cannot be accepted until the R2 bucket credentials and public media hostname work. Do not point Vercel Preview at production database or media write credentials.

### 3. Publish and pull the app image

Build in GitHub Actions, not on the 4 GB VM. Trigger the existing **Build app image** workflow for the approved commit and wait for it to succeed. Use its immutable tag `ghcr.io/janellereonal/just-because:sha-<full-commit-sha>`, not `latest`. Ensure the GHCR package is public or log in on the VM using a read-only package token without exposing it in terminal history.

The source repository is private, which is separate from the GHCR image's visibility. An admin workstation needs GitHub access to fetch or clone the branch; if Git reports an authentication error, sign in there with `gh auth login` (or use an already authorized SSH key). Because the workflow only publishes automatically for `main`, use GitHub's **Actions → Build app image → Run workflow** and select the approved `codex/just-because-work` branch to publish this branch's commit. The VM does not need a GitHub source checkout when you copy the Compose files from that workstation and deploy only the built image. If the GHCR package is private, the VM must separately authenticate to `ghcr.io` with a GitHub personal access token (classic) that has `read:packages` access to that package. Use Docker's credential storage and enter the token only at the interactive prompt; never put it in a command argument, Compose file, or `.env`. If the image package is public, `docker pull` requires no login. GitHub Actions publishes with its workflow token; it does not use your personal credentials.

```sh
docker pull ghcr.io/janellereonal/just-because:sha-<full-commit-sha>
docker image inspect ghcr.io/janellereonal/just-because:sha-<full-commit-sha> --format '{{.Os}}/{{.Architecture}}'
```

The published multi-platform image supports the common `x86_64` (`amd64`) and `aarch64` (`arm64`) VM architectures.

### 4. Back up, migrate, and start privately

Before the first production migration, verify `.env` points to the intended Neon production project and take/verify a Neon backup or restore point. The one-shot `migrate` service applies checked-in Drizzle schema migrations. It does not copy rows, migrate media, or configure external services. Review pending migration files and compatibility with the existing Vercel production app before running it. The migration command prefers `DATABASE_URL_UNPOOLED`, falling back to `DATABASE_URL`.

```sh
cd /opt/just-because/deployment/app
export APP_IMAGE=ghcr.io/janellereonal/just-because:sha-<full-commit-sha>
docker compose --profile maintenance run --rm migrate
docker compose -f compose.yaml -f compose.private.yaml up -d --no-build app
docker compose -f compose.yaml -f compose.private.yaml ps
docker compose -f compose.yaml -f compose.private.yaml logs --tail=100 app
```

`compose.private.yaml` binds `127.0.0.1:18080` **on the VM only**. It does not expose the app on the VM's LAN or public interface. Check health from the container:

```sh
docker compose -f compose.yaml -f compose.private.yaml exec app node -e "fetch('http://127.0.0.1:8080/').then(r=>{console.log(r.status);process.exit(r.ok?0:1)}).catch(e=>{console.error(e.message);process.exit(1)})"
```

To view the private app from an admin Mac, open an SSH local forward over Tailscale, then browse to `http://localhost:18080`:

```sh
ssh -N -L 18080:127.0.0.1:18080 <vm-user>@<vm-tailscale-ip>
```

The canonical auth origin remains `https://justbecause.site`; OAuth callbacks, payment webhooks, email links, public R2 media, and full browser sign-in cannot be considered verified until public HTTPS/DNS and provider callbacks are configured. The private run confirms the image boots and can reach the configured backend; it is not a public launch.

### 5. Backend checks before public ingress

- Confirm the app container is healthy and restarts after a VM reboot.
- Verify Neon connectivity from the running app without printing the connection string; confirm expected schema/migration version and that normal read/write operations work.
- Confirm R2 credentials and bucket permissions using a controlled test upload only after media hostname is set up; verify object read and deletion.
- Keep payments in test mode; do not register the final webhook until HTTPS is serving the canonical hostname.
- Configure email sender, OAuth callback URLs, and daily job only after their final public origin is reachable. Do not enable production cron while staging or callback setup is incomplete.
- Keep Vercel Preview isolated with a separate database, media credentials, auth secret/callback origin, payment test keys, safe email configuration, and no production cron.

## Phase 2: public ingress and front-end cutover

After private backend verification, choose Cloudflare Tunnel or a small VPS relay as public ingress. **Caddy is included** in `compose.yaml` under the `public` profile, with its configuration in `Caddyfile`; it can terminate HTTPS and proxy to the app when Caddy shares the app's host/network (as in the existing Lightsail deployment). For the preferred Cloudflare Tunnel route, Cloudflare terminates public HTTPS and forwards to `http://app:8080`, so Caddy need not run on THEPC. If choosing a VPS relay, Caddy belongs on that public VPS and must proxy to the app over Tailscale; the current same-host `Caddyfile` is not by itself the relay configuration. Do not publish port 8080 or SSH. Cloudflare HTTPS, public auth, email links, PayMongo webhook, R2 media hostname, full browser flows, and DNS cutover are separate acceptance gates. Keep Lightsail available for rollback until those checks pass.

Track progress in the [THEPC rollout checklist](../../doc/plan/1793703335_thepc_vm_production_rollout.md). For local development, `compose.local.yaml` binds the app to loopback on the development machine:

```sh
docker compose -f compose.yaml -f compose.local.yaml up -d --build
```
