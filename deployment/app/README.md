# Prepare the app backend on THEPC

This runbook separates **private app/backend preparation** from the later **public ingress and front-end cutover**. The target is the Linux VM on THEPC running Ubuntu 26.04.1. It reports 3.3 GiB memory, a 60 GB virtual disk, and a 28 GB root filesystem with about 20 GB free. Docker Compose runs the Node/Nitro app. Neon PostgreSQL and Cloudflare R2 remain external; the VM disk is for Ubuntu, Docker image layers, and logs. Namecheap remains the domain registrar. Cloudflare Tunnel or a VPS relay can be chosen later; neither is required to install and start the app privately.

The prior repository work already prepared the multi-stage app Dockerfile, Compose app and migration services, local Compose configuration, R2 storage adapter, Tunnel profile, GHCR image workflow, and hosting/rollout docs. The first multi-platform CI build stalled on emulated ARM64 and was cancelled. The replacement AMD64-only image build succeeded for THEPC's `x86_64` VM. This does **not** mean the production database migration, public ingress, or deployment has been verified.

The app code is based on the current local `main` commit. Self-hosted image builds select R2 uploads; Vercel continues to use its Blob upload path. The API honors `MEDIA_STORAGE_PROVIDER=r2` even if an old Blob token is present, so provider selection stays consistent during migration.

## Start here: migration checklist

Complete these in order. Keep the production website on its current host until the private VM checks pass. The current LAN Mac `.env` is not a VM deployment file: the last local review found the Neon URLs and canonical app/media URLs present, but R2 account/bucket credentials and an immutable image tag were missing. The database URLs looked structurally consistent, but were not authenticated against Neon. Do not copy that Mac `.env` to the VM.

- [x] Join THEPC's Ubuntu VM to the same Tailscale network as your Mac, enable Tailscale SSH, and confirm you can reconnect after closing the current terminal.
- [x] Confirm the VM has Docker Compose and note `uname -m`. Current guest: `x86_64`, 3.3 GiB memory, 60 GB virtual disk, 28 GB root filesystem (20 GB free); confirm storage expansion only if more root space is needed.
- [ ] In Neon, identify the intended **production** project/branch and obtain its pooled runtime URL plus matching direct/unpooled migration URL. Confirm the project and database match; do not paste either URL into chat.
- [ ] Before migrations, create or verify a recent Neon backup/restore point and confirm it can be restored. Stop here if you cannot identify the production project or backup.
- [ ] In Cloudflare R2, prepare the production bucket and a bucket-scoped access key/secret. Record the account ID, bucket name, and the planned public media URL `https://media.justbecause.site`. Do not put the R2 secret in GitHub Actions Variables.
- [x] On the admin Mac, authenticate to GitHub, set the public build variable `R2_PUBLIC_URL`, publish the branch image from GitHub Actions, and record its full commit SHA (`e63b97a2f58de6aa8b21444cb522405f354c7110`).
- [x] Copy only the Compose files and `.env.example` to the VM, create the VM's private `.env` with mode 600, and pin `APP_IMAGE` to that SHA image.
- [ ] Validate the pulled image platform, then review migration files and confirm compatibility with the existing production app. Compose config is valid; image pull still needs `sudo` on this VM.
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

On this VM, the `justbecause` account currently cannot access `/var/run/docker.sock` directly. Run Docker commands below with `sudo` (for example, `sudo docker compose ...`) and enter the Ubuntu password when prompted. Do not paste that password into a command or chat. Adding the user to the `docker` group removes the prompt but grants root-equivalent access; use that only if you intentionally want that tradeoff.

The local Mac image previously built as `linux/arm64`; do not deploy it to THEPC's `x86_64` VM. The current GitHub Actions workflow publishes an immutable `linux/amd64` image for THEPC. If a future host uses ARM64, update the workflow deliberately and verify that architecture separately.

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

The current workflow builds `linux/amd64` for THEPC and publishes the image as `ghcr.io/janellereonal/just-because:sha-<FULL_COMMIT_SHA>`. The successful AMD64-only build for commit `e63b97a2f58de6aa8b21444cb522405f354c7110` is available as `ghcr.io/janellereonal/just-because:sha-e63b97a2f58de6aa8b21444cb522405f354c7110`. Use the 40-character SHA from the specific successful run in `.env`. Deploy only after the matching workflow run succeeds. The `latest` tag is reserved for pushes to `main`; do not deploy it because it can change between releases.

Before the build, set the GitHub repository **Actions variables** under **Settings → Secrets and variables → Actions → Variables**. Add `R2_PUBLIC_URL` with the public HTTPS media hostname `https://media.justbecause.site`. `VITE_POSTHOG_KEY` is optional; set it only if production analytics should be enabled. `VITE_POSTHOG_REGION` is optional and defaults to `us`. These are public build-time values; do not put credentials or keys that grant write access in Actions Variables. R2 secret access keys stay only in the VM's `.env`. If you update an Actions Variable after a build, rerun the image workflow; the existing image will not pick up the new value.

#### C. Copy deployment files to THEPC

This subsection has **two separate terminal locations**. Do not paste both blocks into one terminal:

1. Run block **A on the admin Mac**, from the Just-Because repository root. It transfers only the Compose files and `.env.example`; it does not transfer credentials, source code, or the Docker image.
2. Run block **B in the Ubuntu VM terminal**. It installs those files under `/opt/just-because/deployment/app`, makes a private `.env` copy, and opens it for editing.

The Mac's Tailscale app and the VM's Tailscale service must both be connected to the same tailnet. The VM login is `justbecause`. Use the VM's Tailscale MagicDNS name or its `100.x.y.z` Tailscale IP as `VM_HOST`.

**A. On the admin Mac, from the repository root:**

```sh
export VM_USER=justbecause
export VM_HOST=just-because-vm # replace with the VM's MagicDNS name or Tailscale IP
ssh "$VM_USER@$VM_HOST" 'mkdir -p /tmp/just-because-app'
scp deployment/app/compose.yaml deployment/app/compose.private.yaml deployment/app/.env.example \
  "$VM_USER@$VM_HOST:/tmp/just-because-app/"
```

What to expect: `ssh` may ask you to approve the VM host key the first time. It then creates `/tmp/just-because-app` on the VM. `scp` should finish by returning to your Mac prompt without an error. The `/tmp` folder is only a transfer location and contains no secrets.

**B. On the Ubuntu VM terminal, install the transferred files and prepare `.env`:**

```sh
sudo install -d -o "$USER" -g "$USER" /opt/just-because/deployment/app
cp /tmp/just-because-app/compose.yaml /tmp/just-because-app/compose.private.yaml \
  /tmp/just-because-app/.env.example /opt/just-because/deployment/app/
cd /opt/just-because/deployment/app
cp -n .env.example .env
chmod 600 .env
nano .env
```

The first command creates `/opt/just-because/deployment/app` and assigns it to your logged-in VM user. It uses `sudo`, so it requires a working Ubuntu administrator password. If `sudo` says `Authentication failed`, **stop here**; Tailscale access does not bypass Ubuntu administrator permissions. Do not keep retrying guesses or loosen directory permissions. Resolve the VM account's sudo access before continuing. The remaining commands copy the files from `/tmp`, enter the destination directory, create `.env` only if it does not already exist, restrict it to your account, and open it in `nano`.

In nano, fill `.env` with the production values from section 2. Add this line, using the exact SHA from step A:

```dotenv
APP_IMAGE=ghcr.io/janellereonal/just-because:sha-REPLACE_WITH_40_CHARACTER_SHA
```

Save in nano with **Ctrl+O**, press **Enter**, then **Ctrl+X**. The file stays on the VM; never copy `.env` back to the workstation or commit it. If `cp -n .env.example .env` leaves an existing `.env` untouched, that is intentional: it preserves existing settings. Open it with `nano .env` and update it without replacing it wholesale.

#### Troubleshooting this transfer and setup

- **`tailscale` or `ssh` cannot find the VM / `Could not resolve hostname`:** confirm Tailscale is connected on both devices. Replace `VM_HOST` with the VM's Tailscale `100.x.y.z` IP if its MagicDNS name does not resolve. Re-run block A after correcting `VM_HOST`.
- **`scp: ... No such file or directory`:** on the Mac, `cd` to the Just-Because repository root first, then confirm `deployment/app/compose.yaml` exists with `ls deployment/app/compose.yaml` and repeat block A.
- **`Permission denied` while creating `/opt/...` or copying into it:** the VM user lacks the needed administrator or directory access. Stop and resolve VM sudo access; do not use `chmod 777` and do not put secrets in `/tmp`.
- **`cp: cannot stat '/tmp/just-because-app/...'`:** block A did not complete successfully or was run against a different VM. Re-run block A on the Mac and confirm the files arrived before continuing with block B.
- **Nano opens an empty file or `.env` is missing:** confirm the VM prompt is in `/opt/just-because/deployment/app` and `.env.example` is present (`ls -la`). Do not enter secrets until the template has been copied successfully.
- **A command seems to do nothing:** successful `mkdir`, `cp`, and `chmod` commands are usually silent. Returning to the shell prompt without an error means the command completed; `nano .env` should open the editor.

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
sudo docker compose pull app
```

If it is private, create a GitHub **personal access token (classic)** with only `read:packages` access (and grant SSO access if GitHub prompts). On the VM, log in with your GitHub username and enter the token at Docker's password prompt. The commands below use a temporary Docker credential directory and remove it after the pull, instead of leaving the login in the VM's normal Docker config:

```sh
set -e
cd /opt/just-because/deployment/app
export GH_USERNAME=YOUR_GITHUB_USERNAME
ROOT_DOCKER_CONFIG=/run/just-because-ghcr-config
sudo install -d -m 700 "$ROOT_DOCKER_CONFIG"
cleanup_ghcr_credentials() {
  sudo env DOCKER_CONFIG="$ROOT_DOCKER_CONFIG" docker logout ghcr.io >/dev/null 2>&1 || true
  sudo rm -rf -- "$ROOT_DOCKER_CONFIG"
}
trap cleanup_ghcr_credentials EXIT
sudo env DOCKER_CONFIG="$ROOT_DOCKER_CONFIG" docker login ghcr.io --username "$GH_USERNAME"
sudo env DOCKER_CONFIG="$ROOT_DOCKER_CONFIG" docker compose pull app
cleanup_ghcr_credentials
trap - EXIT
unset GH_USERNAME ROOT_DOCKER_CONFIG
```

Replace `YOUR_GITHUB_USERNAME` before running the command. At the password prompt, paste the token; it will not be echoed. Do not append the token to the command, put it in `.env`, or send it in chat. If login or pull fails, check the token's `read:packages` scope and that the GHCR package grants access to the private repository. GitHub Actions itself uses the workflow's `GITHUB_TOKEN` to publish; no personal token belongs in repository secrets for this workflow.

The current published image targets THEPC's `x86_64` (`amd64`) architecture. Confirm the pulled tag and architecture before starting the app:

```sh
cd /opt/just-because/deployment/app
sudo docker compose config --quiet
sudo docker image inspect "$(sed -n 's/^APP_IMAGE=//p' .env)" --format '{{.Os}}/{{.Architecture}}'
```

The image architecture should report `linux/amd64` for THEPC. `sudo docker compose config --quiet` validates configuration without printing the expanded environment. Do not continue if it fails, the image tag is not the expected SHA, or the image architecture does not match the VM.

### 4. Back up, migrate, and start privately

**Stop and confirm before this step:** verify `.env` points to the intended Neon production project, verify a recent Neon backup/restore point, and review pending Drizzle migrations for compatibility with the current Vercel production app. Do not run the migration if the database target is uncertain, the backup is missing, or a migration appears destructive or incompatible. The one-shot `migrate` service applies checked-in Drizzle schema migrations. It does not copy rows, migrate media, or configure external services. The migration command prefers `DATABASE_URL_UNPOOLED`, falling back to `DATABASE_URL`.

```sh
cd /opt/just-because/deployment/app
sudo docker compose --profile maintenance run --rm migrate
sudo docker compose -f compose.yaml -f compose.private.yaml up -d --no-build app
sudo docker compose -f compose.yaml -f compose.private.yaml ps
sudo docker compose -f compose.yaml -f compose.private.yaml logs --tail=100 app
```

`compose.private.yaml` binds `127.0.0.1:18080` **on the VM only**. It does not expose the app on the VM's LAN or public interface. Check health from the container:

```sh
sudo docker compose -f compose.yaml -f compose.private.yaml exec app node -e "fetch('http://127.0.0.1:8080/').then(r=>{console.log(r.status);process.exit(r.ok?0:1)}).catch(e=>{console.error(e.message);process.exit(1)})"
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

### Routine app updates after launch

The Docker image contains the app code and runtime. Updating it replaces/recreates the **app container**; it does not delete or replace the external Neon database, the R2 bucket, or the VM's `.env`. Keep those services and credentials persistent outside the app container. The current Compose setup runs a single app instance, so each update can briefly interrupt requests while Docker replaces it and the new app becomes healthy. This setup does not provide zero-downtime deployment; a request during that interval may need to be retried.

Keep staging and production separate when releasing changes: review the change in Vercel Preview with its staging-only database and credentials, then deploy the approved commit's immutable SHA image to the VM. The production VM continues to use its own `.env`; never copy the production `.env` to Vercel or use its secrets in Preview.

For each production release:

1. Confirm the change works in Vercel Preview and that Preview uses isolated services.
2. Build and publish the approved commit from GitHub Actions, then record its full SHA tag. Do not deploy `latest`.
3. On the VM, record the current `APP_IMAGE` tag for rollback, then update only that line in `/opt/just-because/deployment/app/.env` to the new SHA tag. Leave all other environment settings unchanged.
4. Pull the new image with `sudo docker compose pull app`. Review any new Drizzle migrations. If schema changes are present, verify the Neon production target and a restorable backup, then confirm the migrations are compatible with both the current and new app versions before applying them. Skip migration when the release has no unapplied schema changes. Stop for a migration that is destructive or incompatible; reverting an image does not reverse database changes.
5. Recreate the app using the same Compose mode already in service. During private Phase 1, use the loopback-only command below. After Cloudflare Tunnel is configured, start the app and tunnel profile instead:

```sh
# Private Phase 1 only:
sudo docker compose -f compose.yaml -f compose.private.yaml up -d --no-build app

# Public Cloudflare Tunnel deployment after Phase 2 is configured:
sudo docker compose --profile tunnel up -d --no-build app cloudflared
```

6. Check `sudo docker compose ps` and recent app logs, then confirm the app health check passes. If the new image fails and no incompatible database migration was applied, restore the previous `APP_IMAGE` tag in `.env`, pull that tag if needed, and recreate the app with the same Compose mode. Keep the previous image tag available until the release is verified.

Plan updates during a low-traffic window. For seamless updates with no single-container interruption, the hosting design would need an additional deployment strategy, such as running two app instances behind a health-aware proxy; that is outside the current single-VM Compose setup.

## Phase 2: public ingress and front-end cutover

After private backend verification, choose Cloudflare Tunnel or a small VPS relay as public ingress. **Caddy is included** in `compose.yaml` under the `public` profile, with its configuration in `Caddyfile`; it can terminate HTTPS and proxy to the app when Caddy shares the app's host/network (as in the existing Lightsail deployment). For the preferred Cloudflare Tunnel route, Cloudflare terminates public HTTPS and forwards to `http://app:8080`, so Caddy need not run on THEPC. If choosing a VPS relay, Caddy belongs on that public VPS and must proxy to the app over Tailscale; the current same-host `Caddyfile` is not by itself the relay configuration. Do not publish port 8080 or SSH. Cloudflare HTTPS, public auth, email links, PayMongo webhook, R2 media hostname, full browser flows, and DNS cutover are separate acceptance gates. Keep Lightsail available for rollback until those checks pass.

Track progress in the [THEPC rollout checklist](../../doc/plan/1793703335_thepc_vm_production_rollout.md). For local development, `compose.local.yaml` binds the app to loopback on the development machine:

```sh
docker compose -f compose.yaml -f compose.local.yaml up -d --build
```
