# Self-host the Just Because app

This deployment runs the app's Node server in Docker. It expects a PostgreSQL database and keeps uploads on a Docker volume when `BLOB_READ_WRITE_TOKEN` is empty. The built-in disk upload option is for one app instance; use Vercel Blob or implement shared object storage before scaling replicas. Vercel remains the existing production deployment path.

## Configure and start

Install Docker Engine and the Compose plugin on a supported Linux distribution. Copy `deployment/app/.env.example` to `deployment/app/.env` and fill in the production values. Keep `.env` private. Set `APP_DOMAIN`, `BETTER_AUTH_URL`, and `APP_BASE_URL` to the same hostname and HTTPS origin. `DATABASE_URL` must be reachable from the container. Use a migration-capable `DATABASE_URL_UNPOOLED` if your database provider distinguishes pooled and direct connections. Generate a unique `BETTER_AUTH_SECRET`; do not reuse development credentials.

Create a DNS A record for the hostname pointing to the VPS public IPv4. Allow inbound TCP 80 and 443 (and optionally UDP 443 for HTTP/3) in both the provider firewall and host firewall. Restrict SSH to your admin IP, use key authentication, disable password login after confirming key access, and keep system packages updated. Never publish app port 8080 to the internet.

Apply schema changes deliberately before starting or updating the service. The one-shot migration service reads the same private environment file and is enabled only when you request it:

```sh
docker compose -f deployment/app/compose.yaml --profile maintenance run --rm migrate
docker compose -f deployment/app/compose.yaml --profile public up -d --build
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

Use a protected script/environment file for the secret instead of leaving it in a shared crontab. Back up PostgreSQL and the `app_uploads` volume; restore both together. Alternatively configure `BLOB_READ_WRITE_TOKEN` for Vercel Blob. To update, fetch the desired Git revision and run the Compose build command again. To stop, run `docker compose -f deployment/app/compose.yaml down`; the named upload volume remains. Roll back by checking out the previous known-good revision and rebuilding.

The image build produces the Node Nitro server and does not automatically migrate or seed the database. The migration service uses `DATABASE_URL_UNPOOLED` when provided, then falls back to `DATABASE_URL`. Run migrations as a deliberate release step with the opt-in maintenance service. Optional build-time analytics (`VITE_POSTHOG_KEY` and `VITE_POSTHOG_REGION`) must be supplied as build arguments if needed; otherwise analytics remains disabled.
