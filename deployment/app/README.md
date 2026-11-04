# Prepare the app backend on THEPC

This runbook separates **private app/backend preparation** from the later **public ingress and front-end cutover**. The immediate target is the Linux VM on THEPC (owner-reported 4 GB RAM and 50 GB storage; user reports Ubuntu 26 installed). Docker Compose runs the Node/Nitro app. Neon PostgreSQL and Cloudflare R2 remain external; the VM disk is for Ubuntu, Docker image layers, and logs. Namecheap remains the domain registrar. Cloudflare Tunnel or a VPS relay can be chosen later; neither is required to install and start the app privately.

The prior repository work already prepared the multi-stage app Dockerfile, Compose app and migration services, local Compose configuration, R2 storage adapter, Tunnel profile, GHCR image workflow, and hosting/rollout docs. A local ARM64 image was built on the Mac and returned HTTP 200 with dummy database settings; it was removed afterward. This does **not** mean the VM image, production credentials, database migration, or deployment have been verified.

The app code is based on the current local `main` commit. Self-hosted image builds select R2 uploads; Vercel continues to use its Blob upload path. The API honors `MEDIA_STORAGE_PROVIDER=r2` even if an old Blob token is present, so provider selection stays consistent during migration.

## Start here: migration checklist

Complete these in order. Keep the production website on its current host until the private VM checks pass. The current LAN Mac `.env` is not a VM deployment file: the last local review found the Neon URLs and canonical app/media URLs present, but R2 account/bucket credentials and an immutable image tag were missing. The database URLs looked structurally consistent, but were not authenticated against Neon. Do not copy that Mac `.env` to the VM.

- [ ] Join THEPC's Ubuntu VM to the same Tailscale network as your Mac, enable Tailscale SSH, and confirm you can reconnect after closing the current terminal.
- [ ] Confirm the VM has Docker Compose, at least 4 GB RAM / 50 GB disk, and note `uname -m`.
- [ ] In Neon, identify the intended **production** project/branch and obtain its pooled runtime URL plus matching direct/unpooled migration URL. Confirm the project and database match; do not paste either URL into chat.
- [ ] Before migrations, create or verify a recent Neon backup/restore point and confirm it can be restored. Stop here if you cannot identify the production project or backup.
- [ ] In Cloudflare R2, prepare the production bucket and a bucket-scoped access key/secret. Record the account ID, bucket name, and the planned public media URL `https://media.justbecause.site`. Do not put the R2 secret in GitHub Actions Variables.
- [ ] On the admin Mac, authenticate to GitHub, set the public build variable `R2_PUBLIC_URL`, publish the branch image from GitHub Actions, and record its full commit SHA.
- [ ] Copy only the Compose files and `.env.example` to the VM, create the VM's private `.env`, enter values there, and pin `APP_IMAGE` to that SHA image.
- [ ] Validate configuration, pull the exact image, inspect its platform, then review migration files and confirm compatibility with the existing production app.
- [ ] **Migration gate:** run the production migration only after the production Neon target and restorable backup have both been confirmed. Then start the app privately and check its health.
- [ ] Smoke-test the private app. Leave public DNS, Cloudflare Tunnel, OAuth callbacks, email links, payments, and cron for Phase 2 after private checks pass.

## Phase 1: prepare and verify the backend privately

### Connect to THEPC over Tailscale SSH

Tailscale SSH is the private administrative path for the VM. It authenticates you through your Tailscale identity and tailnet access policy; it does not require a public SSH port, router port forwarding, or copying SSH keys to the VM. The VM must be Linux and joined to the same tailnet as your admin Mac.

Run the following checks on the Ubuntu VM terminal **one command at a time**. The VM login shown in your screenshot is `justbecause`; use that Linux username later from the Mac.

```sh
command -v tailscale
```

If it prints no path (the command returns to the prompt without output), install Tailscale with this command by itself and wait for the normal `$` prompt to return:

```sh
curl -fsSL https://tailscale.com/install.sh | sh
```

Then join the VM to your tailnet. On first setup this prints a sign-in URL; open it and approve the VM using the Tailscale account already used on your Mac. If the VM is already connected in Tailscale, skip this command:

```sh
sudo tailscale up --hostname=just-because-vm
```

After the VM appears as connected in the Tailscale admin console, enable Tailscale SSH on the VM:

```sh
sudo tailscale set --ssh
sudo tailscale status
sudo tailscale ip -4
```

On the admin Mac, install and open the [Tailscale app for macOS](https://tailscale.com/download/mac), then sign in to the same tailnet account and confirm the VM appears as connected. You do **not** need the `tailscale` command-line tool for this. Use macOS's built-in OpenSSH client to connect over Tailscale SSH:

```sh
ssh justbecause@just-because-vm
```

If the short name does not resolve, use the VM's full MagicDNS name or its `100.x.y.z` Tailscale IP from the Tailscale admin console:

```sh
ssh justbecause@100.x.y.z
```

If the Mac says `command not found: tailscale`, that is okay; use the `ssh` command above. If SSH says the host cannot be found, confirm the Mac Tailscale app is connected and MagicDNS is enabled. If access is denied, check the policy note below. Exit the VM session with `exit`.

Tailscale SSH also requires the tailnet policy to allow both network access to the VM on TCP port 22 and SSH access for your Tailscale identity to the Linux user. The default policy may already allow this; if the connection says access is denied, the tailnet owner/admin should review **Tailscale Admin Console → Access controls**. Device approval may also need to be completed in the admin console. Tailscale SSH claims port 22 only on the VM's Tailscale address; keep router forwarding and public SSH closed. See [Tailscale SSH setup](https://tailscale.com/docs/features/tailscale-ssh) and [MagicDNS](https://tailscale.com/docs/features/magicdns).

### 1. Verify VM prerequisites

Connect over Tailscale SSH and record:

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

### 2. Gather production backend settings

This is a preparation step; create the VM `.env` later in step 3C, after copying `.env.example` to the VM. Do not copy a developer `.env`, local database, or build output. Before continuing, have the intended production Neon URLs, R2 bucket credentials, canonical app/media URLs, and a newly generated `BETTER_AUTH_SECRET` ready. Populate `DATABASE_URL` with the Neon pooled/runtime URL and `DATABASE_URL_UNPOOLED` with the matching direct migration URL. Set `BETTER_AUTH_URL=https://justbecause.site` and `APP_BASE_URL=https://justbecause.site`. Set `MEDIA_STORAGE_PROVIDER=r2` and the production R2 account ID, bucket, bucket-scoped key/secret, and `R2_PUBLIC_URL=https://media.justbecause.site`.

Keep `CRON_SECRET`, Google OAuth, Resend, and PayMongo values empty until those integrations are ready. Never paste values into chat, commit `.env`, or put secrets in command arguments/history. Generate a new auth secret for this deployment rather than reusing the Mac development value; `openssl rand -hex 32` can generate one locally. Do not store its output in shell history or a shared terminal transcript.

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

The source repository is private, which is separate from the GHCR image's visibility. Follow these steps on an admin workstation and the VM. The VM does not need a GitHub source checkout: it receives the Compose files from your workstation and pulls only the built image.

#### A. Sign in to GitHub on the admin workstation

Install GitHub CLI if needed (`brew install gh` on macOS), then sign in to the GitHub account that has access to `janellereonal/just-because`:

```sh
gh auth login
gh auth status
```

At the prompts, choose **GitHub.com**, **HTTPS**, and browser authentication. To push this branch and see its Actions runs, the account must have **write access** to the repository; read access is enough only to clone or fetch. If you already have a local clone, run these commands inside it. Otherwise, clone first:

```sh
gh repo clone janellereonal/just-because
cd just-because
```

Fetch and switch to the branch being deployed, then record its full commit SHA. The SHA identifies the exact image to deploy:

```sh
git fetch origin
git switch codex/just-because-work
git pull --ff-only origin codex/just-because-work
git rev-parse HEAD
```

#### B. Push the approved commit and wait for its image

The workflow builds automatically when a commit is pushed to `main` or `codex/just-because-work`. This branch push is the dependable trigger and does not require merging the app into `main`; pull request checks do not publish an image. Although the workflow file declares `workflow_dispatch`, GitHub only offers the manual **Run workflow** action if the workflow file is present on the repository's default branch. Set the Actions Variables before triggering a release build. If this documentation push starts a build before `R2_PUBLIC_URL` is set, do not deploy that image; after setting the variable, use **Run workflow** if available, or trigger a fresh branch push. If there are no code or documentation changes to push, an authorized workstation can trigger a new build with:

```sh
git switch codex/just-because-work
git pull --ff-only origin codex/just-because-work
git commit --allow-empty -m "build: publish app image with R2 URL"
git push origin codex/just-because-work
```

This creates an image tag for the new commit SHA even though the app source is unchanged. Deploy only an image built after the `R2_PUBLIC_URL` variable was set.

After committing and pushing the approved changes from the authenticated workstation, record the pushed commit's full SHA and find its run:

```sh
git push origin codex/just-because-work
git rev-parse HEAD
gh run list --workflow build-app-image.yml --branch codex/just-because-work --limit 5
```

Copy the run ID matching that commit and wait for a successful result:

```sh
export RUN_ID=1234567890 # replace with the matching run ID
gh run watch "$RUN_ID"
```

The workflow builds `linux/amd64` and `linux/arm64` and publishes the image as `ghcr.io/janellereonal/just-because:sha-<FULL_COMMIT_SHA>`. Use the 40-character SHA printed by `git rev-parse HEAD` in the `.env` setting below. Deploy only after the matching workflow run succeeds. The `latest` tag is reserved for pushes to `main`; do not deploy it because it can change between releases.

Before the build, set the GitHub repository **Actions variables** under **Settings → Secrets and variables → Actions → Variables**. Add `R2_PUBLIC_URL` with the public HTTPS media hostname `https://media.justbecause.site`. `VITE_POSTHOG_KEY` is optional; set it only if production analytics should be enabled. `VITE_POSTHOG_REGION` is optional and defaults to `us`. These are public build-time values; do not put credentials or keys that grant write access in Actions Variables. R2 secret access keys stay only in the VM's `.env`. If you update an Actions Variable after a build, rerun the image workflow; the existing image will not pick up the new value.

#### C. Copy deployment files to THEPC

Connect over Tailscale. Set `VM_USER` to the Linux login name (`justbecause` on the current THEPC VM) and `VM_HOST` to the VM's MagicDNS name (or its `100.x.y.z` Tailscale IP) on the admin workstation, then copy only these non-secret files. Use the Mac's built-in OpenSSH/SCP commands; the Mac Tailscale app must be open and connected. Recent OpenSSH `scp` uses SFTP, which Tailscale SSH supports:

```sh
export VM_USER=justbecause
export VM_HOST=just-because-vm # replace with the VM's MagicDNS name or Tailscale IP
ssh "$VM_USER@$VM_HOST" 'mkdir -p /tmp/just-because-app'
scp deployment/app/compose.yaml deployment/app/compose.private.yaml deployment/app/.env.example \
  "$VM_USER@$VM_HOST:/tmp/just-because-app/"
```

On the VM, install the files and create `.env` only if it does not already exist, so a later update will not overwrite existing secrets:

```sh
sudo install -d -o "$USER" -g "$USER" /opt/just-because/deployment/app
cp /tmp/just-because-app/compose.yaml /tmp/just-because-app/compose.private.yaml \
  /tmp/just-because-app/.env.example /opt/just-because/deployment/app/
cd /opt/just-because/deployment/app
cp -n .env.example .env
chmod 600 .env
nano .env
```

Fill `.env` with the production values from section 2. Add this line, using the exact SHA from step A:

```dotenv
APP_IMAGE=ghcr.io/janellereonal/just-because:sha-REPLACE_WITH_40_CHARACTER_SHA
```

Save the file and leave it on the VM. Never copy `.env` back to the workstation or commit it.

Before pulling or migrating, run this safe presence check. It prints only setting names and statuses, never secret values; every item marked `missing` or `blank` in the required list must be fixed first:

```sh
cd /opt/just-because/deployment/app
python3 - <<'PY'
from pathlib import Path

values = {}
for raw in Path('.env').read_text().splitlines():
    line = raw.strip()
    if not line or line.startswith('#') or '=' not in line:
        continue
    key, value = line.split('=', 1)
    values[key.strip()] = value.strip().strip('"').strip("'")

required = (
    'APP_IMAGE', 'DATABASE_URL', 'DATABASE_URL_UNPOOLED',
    'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'APP_BASE_URL',
    'MEDIA_STORAGE_PROVIDER', 'R2_ACCOUNT_ID', 'R2_BUCKET',
    'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_URL',
)
for key in required:
    value = values.get(key, '')
    print(f'{key}: {"set" if value else "MISSING"}')

if values.get('MEDIA_STORAGE_PROVIDER') != 'r2':
    print('ERROR: MEDIA_STORAGE_PROVIDER must be r2 for this VM deployment.')
if values.get('BETTER_AUTH_URL') != 'https://justbecause.site':
    print('ERROR: check BETTER_AUTH_URL against the production hostname.')
if values.get('APP_BASE_URL') != 'https://justbecause.site':
    print('ERROR: check APP_BASE_URL against the production hostname.')
PY
```

The check confirms only that required values are non-empty; it does not verify credentials against Neon/R2. Keep the output private anyway, and never use `cat .env` or `docker compose config` in a shared transcript because those can reveal values.

#### D. Pull the image from GHCR

Open **GitHub → Your profile → Packages → just-because** to check the package visibility. If it is public, skip login and pull the image:

```sh
cd /opt/just-because/deployment/app
docker compose pull app
```

If it is private, create a GitHub **personal access token (classic)** with only `read:packages` access (and grant SSO access if GitHub prompts). On the VM, log in with your GitHub username and enter the token at Docker's password prompt. The commands below use a temporary Docker credential directory and remove it after the pull, instead of leaving the login in the VM's normal Docker config:

```sh
set -e
cd /opt/just-because/deployment/app
export GH_USERNAME=YOUR_GITHUB_USERNAME
export DOCKER_CONFIG="$(mktemp -d)"
chmod 700 "$DOCKER_CONFIG"
cleanup_ghcr_credentials() {
  docker logout ghcr.io >/dev/null 2>&1 || true
  rm -rf -- "$DOCKER_CONFIG"
}
trap cleanup_ghcr_credentials EXIT
docker login ghcr.io --username "$GH_USERNAME"
docker compose pull app
cleanup_ghcr_credentials
trap - EXIT
unset DOCKER_CONFIG
unset GH_USERNAME
```

Replace `YOUR_GITHUB_USERNAME` before running the command. At the password prompt, paste the token; it will not be echoed. Do not append the token to the command, put it in `.env`, or send it in chat. If login or pull fails, check the token's `read:packages` scope and that the GHCR package grants access to the private repository. GitHub Actions itself uses the workflow's `GITHUB_TOKEN` to publish; no personal token belongs in repository secrets for this workflow.

The published multi-platform image supports the common `x86_64` (`amd64`) and `aarch64` (`arm64`) VM architectures. Confirm the pulled tag and architecture before migrating:

```sh
cd /opt/just-because/deployment/app
docker compose config --quiet
docker image inspect "$(sed -n 's/^APP_IMAGE=//p' .env)" --format '{{.Os}}/{{.Architecture}}'
```

The architecture should match the VM (`x86_64` maps to `amd64`; `aarch64` maps to `arm64`). `docker compose config --quiet` validates configuration without printing the expanded environment. Do not continue if it fails, the image tag is not the expected SHA, or the image architecture does not match the VM.

### 4. Back up, migrate, and start privately

**Stop and confirm before this step:** verify `.env` points to the intended Neon production project, verify a recent Neon backup/restore point, and review pending Drizzle migrations for compatibility with the current Vercel production app. Do not run the migration if the database target is uncertain, the backup is missing, or a migration appears destructive or incompatible. The one-shot `migrate` service applies checked-in Drizzle schema migrations. It does not copy rows, migrate media, or configure external services. The migration command prefers `DATABASE_URL_UNPOOLED`, falling back to `DATABASE_URL`.

```sh
cd /opt/just-because/deployment/app
docker compose --profile maintenance run --rm migrate
docker compose -f compose.yaml -f compose.private.yaml up -d --no-build app
docker compose -f compose.yaml -f compose.private.yaml ps
docker compose -f compose.yaml -f compose.private.yaml logs --tail=100 app
```

`compose.private.yaml` binds `127.0.0.1:18080` **on the VM only**. It does not expose the app on the VM's LAN or public interface. Check health from the container:

```sh
docker compose -f compose.yaml -f compose.private.yaml exec app node -e "fetch('http://127.0.0.1:8080/').then(r=>{console.log(r.status);process.exit(r.ok?0:1)}).catch(e=>{console.error(e.message);process.exit(1)})"
```

To view the private app from an admin Mac, open an SSH local forward over Tailscale, then browse to `http://localhost:18080`. Use the VM's MagicDNS name or Tailscale IP. This requires the tailnet SSH policy to permit TCP forwarding; `ssh -L` is an ordinary SSH client connection carried over Tailscale:

```sh
export VM_USER=justbecause
export VM_HOST=just-because-vm # replace with the VM's MagicDNS name or Tailscale IP
ssh -N -L 18080:127.0.0.1:18080 "$VM_USER@$VM_HOST"
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
