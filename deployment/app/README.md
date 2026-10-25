# Self-host the Just Because app

This deployment runs the app's Node server in Docker on a Linux VPS. It uses the existing managed PostgreSQL database and Cloudflare R2 for shared media; the existing Vercel deployment continues to use Vercel Blob. Local disk uploads are development-only.

## Recommended starter: Lightsail and R2

Use an AWS Lightsail Linux instance in Singapore with 2 GB RAM as the starter size. The plan used for this recommendation includes 2 vCPUs, 60 GB SSD, public IPv4 and a 3 TB transfer allowance. Build and publish the image in GitHub Actions; the VPS only pulls and runs a tagged image. Add Cloudflare DNS records for the app hostname and `media.<domain>`, and attach the latter as the public custom domain for an R2 bucket. Keep the R2 bucket private to writes: public reads use its custom domain, while only the app's scoped R2 API key can write or delete objects.

Enable Lightsail CPU and memory alarms and billing notifications before launch. Start with 2 GB; move to the 4 GB plan only if sustained memory pressure or restarts appear in container/host metrics. Keep the VPS firewall limited to SSH from your admin IP plus TCP 80/443 (UDP 443 is optional for HTTP/3). Apply OS security updates and use SSH keys.

R2 configuration in `.env`: `MEDIA_STORAGE_PROVIDER=r2`, `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_PUBLIC_URL=https://media.<domain>`. Create an R2 token scoped to that bucket with object read/write/list permissions. Never put R2 secrets in build arguments or the image. Set the GitHub repository variable `R2_PUBLIC_URL` to the same public URL so CSP and browser validation include it. In Vercel, set the same `VITE_R2_PUBLIC_URL` build variable so Vercel can validate and display R2 media in the shared database; keep `BLOB_READ_WRITE_TOKEN` configured there for new Vercel uploads. For cross-deployment deletion of R2 media, also configure the R2 credentials on Vercel.

The bucket's public custom domain serves reads. Browser uploads post to the app first; this lets the server enforce actual byte limits and permissions before writing to R2. No R2 browser CORS rule is needed for upload requests. Restrict writes to the app's R2 token and protect the media hostname with the intended bucket/domain settings.

## Configure and start

Install Docker Engine and the Compose plugin on a supported Linux distribution. Copy `deployment/app/.env.example` to `deployment/app/.env` and fill in the production values. Keep `.env` private. Set `APP_DOMAIN`, `BETTER_AUTH_URL`, and `APP_BASE_URL` to the same hostname and HTTPS origin. `DATABASE_URL` must be reachable from the container. Use a migration-capable `DATABASE_URL_UNPOOLED` if your database provider distinguishes pooled and direct connections. Generate a unique `BETTER_AUTH_SECRET`; do not reuse development credentials.

Create a DNS A record for the hostname pointing to the VPS public IPv4. Allow inbound TCP 80 and 443 (and optionally UDP 443 for HTTP/3) in both the provider firewall and host firewall. Restrict SSH to your admin IP, use key authentication, disable password login after confirming key access, and keep system packages updated. Never publish app port 8080 to the internet.

Copy the Compose file and Caddyfile to `/opt/just-because/deployment/app`, and create `.env` there from `.env.example`. Make the GHCR image public for anonymous VPS pulls, or configure Docker login on the server. Add GitHub Actions secrets `LIGHTSAIL_HOST`, `LIGHTSAIL_USER`, `LIGHTSAIL_SSH_PRIVATE_KEY`, and `LIGHTSAIL_SSH_KNOWN_HOSTS`. The build workflow publishes `ghcr.io/janellereonal/just-because:sha-<commit>`. The deploy workflow takes that immutable tag and optionally runs migrations.

For first setup, pull the built image and create the schema deliberately before starting the service:

```sh
APP_IMAGE=ghcr.io/janellereonal/just-because:sha-<commit> docker compose -f deployment/app/compose.yaml --profile maintenance run --rm migrate
APP_IMAGE=ghcr.io/janellereonal/just-because:sha-<commit> docker compose -f deployment/app/compose.yaml --profile public up -d --no-build
docker compose -f deployment/app/compose.yaml ps
curl --fail https://gifts.example.com/
```

The `public` profile starts Caddy, which obtains and renews HTTPS certificates after DNS resolves correctly and ports 80/443 are reachable. The app host port binds to `127.0.0.1` by default; Caddy reaches the app over the private Compose network. Check `docker compose -f deployment/app/compose.yaml logs caddy app` if certificate provisioning or startup fails. Persist the Caddy data/config volumes when backing up or migrating the host.

For a same-network preview without Caddy, set `APP_BIND_ADDRESS=0.0.0.0` and a suitable `APP_PORT` in the private `.env`, then allow that port only on the private network. Open `http://<host-lan-ip>:<APP_PORT>` from another device. Restore `APP_BIND_ADDRESS=127.0.0.1` for public hosting.

## VPS and EC2

For EC2, use a supported Linux image, attach an appropriately scoped security group, and configure storage/backup for Docker volumes. Keep app secrets in a protected environment file or a secrets manager. Do not place `.env` in Git. Configure OAuth redirect URLs and the PayMongo webhook at `https://<hostname>/api/webhooks/paymongo`. Live PayMongo keys are explicitly blocked until `PAYMONGO_ALLOW_LIVE=true` is configured in the app environment.

## Operations

Vercel Cron does not run in this deployment. Schedule the authenticated daily endpoint on the host once per day (for example with cron):

```cron
0 1 * * * curl --fail --silent --show-error -H "Authorization: Bearer YOUR_CRON_SECRET" https://gifts.example.com/api/cron/daily
```

Use a protected script/environment file for the secret instead of leaving it in a shared crontab. Back up PostgreSQL and retain R2 object versioning or a separate bucket backup policy if recovery of deleted files is required. To update, run the build workflow, then deploy its `sha-<commit>` tag. Roll back by rerunning the deploy workflow with the previous image tag. To stop, run `docker compose -f deployment/app/compose.yaml down`; Caddy's data/config volumes remain.

The image build produces the Node Nitro server and does not automatically migrate or seed the database. The migration service uses `DATABASE_URL_UNPOOLED` when provided, then falls back to `DATABASE_URL`. Run migrations as a deliberate release step. Optional build-time analytics (`VITE_POSTHOG_KEY` and `VITE_POSTHOG_REGION`) must be configured as GitHub repository variables; otherwise analytics remains disabled.
