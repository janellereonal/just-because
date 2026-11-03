# Prepare the app backend on THEPC

This runbook separates **private app/backend preparation** from the later **public ingress and front-end cutover**. The immediate target is the Linux VM on THEPC (owner-reported 4 GB RAM and 50 GB storage; user reports Ubuntu 26 installed). Docker Compose runs the Node/Nitro app. Neon PostgreSQL and Cloudflare R2 remain external; the VM disk is for Ubuntu, Docker image layers, and logs. Namecheap remains the domain registrar. Cloudflare Tunnel or a VPS relay can be chosen later; neither is required to install and start the app privately.

The prior repository work already prepared the multi-stage app Dockerfile, Compose app and migration services, local Compose configuration, R2 storage adapter, Tunnel profile, GHCR image workflow, and hosting/rollout docs. A local ARM64 image was built on the Mac and returned HTTP 200 with dummy database settings; it was removed afterward. This does **not** mean the VM image, production credentials, database migration, or deployment have been verified.

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

The local Mac image previously built as `linux/arm64`. Do not deploy that local image unless `uname -m` reports `aarch64`. GitHub Actions publishes an immutable image from the repository source; check that image's architecture matches the VM before rollout. If the VM reports ARM64, update CI to publish ARM64 (or a multi-platform manifest) before pulling it.

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

Neon is the existing database; this deployment does not move database contents. R2 is the durable media store; uploads should not accumulate on the VM disk. The app can start without R2, but upload flows cannot be accepted until the R2 bucket credentials and public media hostname work. Do not point Vercel Preview at production database or media write credentials.

### 3. Publish and pull the app image

Build in GitHub Actions, not on the 4 GB VM. Trigger the existing **Build app image** workflow for the approved commit and wait for it to succeed. Use its immutable tag `ghcr.io/janellereonal/just-because:sha-<full-commit-sha>`, not `latest`. Ensure the GHCR package is public or log in on the VM using a read-only package token without exposing it in terminal history.

```sh
docker pull ghcr.io/janellereonal/just-because:sha-<full-commit-sha>
docker image inspect ghcr.io/janellereonal/just-because:sha-<full-commit-sha> --format '{{.Os}}/{{.Architecture}}'
```

Confirm the architecture matches `uname -m` (`x86_64` maps to `amd64`; `aarch64` maps to `arm64`). Stop if it does not match.

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

After private backend verification, choose Cloudflare Tunnel or a small VPS relay as public ingress. The current plan favors Tunnel: Cloudflare would host DNS while Namecheap remains registrar. Before changing Namecheap nameservers, inventory/recreate and verify all DNS records, especially MX and SPF/DKIM/DMARC/TXT. Configure Tunnel's public hostname to `http://app:8080`; do not publish port 8080 or SSH. Cloudflare HTTPS, public auth, email links, PayMongo webhook, R2 media hostname, full browser flows, and DNS cutover are separate acceptance gates. Keep Lightsail available for rollback until those checks pass.

Track progress in the [THEPC rollout checklist](../../doc/plan/1793703335_thepc_vm_production_rollout.md). For local development, `compose.local.yaml` binds the app to loopback on the development machine:

```sh
docker compose -f compose.yaml -f compose.local.yaml up -d --build
```
