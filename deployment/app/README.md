# Self-host the Just Because app

This deployment runs the app's Node server in Docker. It expects a PostgreSQL database and keeps uploads on a Docker volume when `BLOB_READ_WRITE_TOKEN` is empty. The built-in disk upload option is for one app instance; use Vercel Blob or implement shared object storage before scaling replicas. Vercel remains the existing production deployment path.

## Configure and start

Install Docker Engine and the Compose plugin. Copy `deployment/app/.env.example` to `deployment/app/.env` and fill in the production values. Keep `.env` private. Set `BETTER_AUTH_URL` and `APP_BASE_URL` to the exact public origin (for example `https://gifts.example.com`); configure OAuth redirect URLs and the PayMongo webhook at `/api/webhooks/paymongo` for that hostname. `DATABASE_URL` must be reachable from the container. Use a migration-capable `DATABASE_URL_UNPOOLED` if your database provider distinguishes pooled and direct connections.

Apply schema changes deliberately from a trusted checkout with Bun installed, then start the service from the repository root:

```sh
bun install --frozen-lockfile
bun run db:migrate
docker compose -f deployment/app/compose.yaml up -d --build
docker compose -f deployment/app/compose.yaml ps
```

The app listens on port 8080 in the container. `APP_PORT` controls the host port. For a same-network preview, allow that TCP port only on the host's private network and open `http://<host-lan-ip>:8080` from another device. Do not expose a raw app port publicly; use a TLS reverse proxy such as Caddy or a load balancer.

## VPS and EC2

Point DNS to the host and put a reverse proxy with HTTPS in front of the app. In the cloud security group, allow inbound 80/443 and restrict SSH to your IP; avoid opening 8080 to the internet. For EC2, use a supported Linux image, attach an appropriately scoped security group, and configure storage/backup for Docker volumes. Keep app secrets in a protected environment file or a secrets manager. Do not place `.env` in Git.

## Operations

Vercel Cron does not run in this deployment. Schedule the authenticated daily endpoint on the host once per day (for example with cron):

```cron
0 1 * * * curl --fail --silent --show-error -H "Authorization: Bearer YOUR_CRON_SECRET" https://gifts.example.com/api/cron/daily
```

Use a protected script/environment file for the secret instead of leaving it in a shared crontab. Back up PostgreSQL and the `app_uploads` volume; restore both together. Alternatively configure `BLOB_READ_WRITE_TOKEN` for Vercel Blob. To update, fetch the desired Git revision and run the Compose build command again. To stop, run `docker compose -f deployment/app/compose.yaml down`; the named upload volume remains. Roll back by checking out the previous known-good revision and rebuilding.

The image build produces the Node Nitro server and does not automatically migrate or seed the database. Run migrations as a deliberate release step. Optional build-time analytics (`VITE_POSTHOG_KEY` and `VITE_POSTHOG_REGION`) must be supplied as build arguments if needed; otherwise analytics remains disabled.
