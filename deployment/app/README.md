# Self-host the Just Because app

The production target is the Linux VM on THEPC (4 GB RAM, 50 GB storage). Docker Compose runs the Node/Nitro app and a Cloudflare Tunnel connector. Neon PostgreSQL and Cloudflare R2 remain external, so the VM disk is for the OS, Docker layers, and logs—not durable user media or database files. The app also remains deployable to Vercel; Vercel Preview is staging only when its database and credentials are isolated.

## Public access and administration

Cloudflare's Free plan provides authoritative DNS and Tunnel at **$0/month** for this setup. Namecheap remains the registrar; Cloudflare becomes the DNS provider. Cloudflare's paid website plans are optional and are not needed just to publish the app through Tunnel. R2 is separately priced, with usage-dependent charges if storage or requests exceed its free allowance. Verify [Cloudflare plan pricing](https://www.cloudflare.com/plans/) and [R2 pricing](https://developers.cloudflare.com/r2/pricing/) before enabling paid features.

Cloudflare Tunnel publishes `justbecause.site` without router port forwarding, a public VM address, or inbound SSH. Add the domain to Cloudflare and recreate/verify every existing DNS record—especially MX, SPF/DKIM/DMARC, and TXT records. Then change the authoritative nameservers in Namecheap to the pair Cloudflare assigns, keeping the current Lightsail A record during this DNS-provider migration. Namecheap remains the registrar. After the home app and Tunnel connector pass checks, change the Cloudflare root record from Lightsail to the Tunnel route. In Cloudflare's Tunnel dashboard, route the public hostname to `http://app:8080`, which resolves on the Compose network. Cloudflare terminates visitor HTTPS; Caddy is not used on THEPC. The Lightsail Caddy profile and deployment workflow remain available for rollback.

Use Tailscale for VM administration and manual deployment. Do not open router ports for SSH or the app, and do not publish port 8080. `cloudflared` makes outbound connections to Cloudflare; no inbound firewall exception is needed. A Cloudflare Tunnel token grants tunnel connectivity, so keep it private and rotate it if exposed. Cloudflare's current [Tunnel docs](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/) describe the nameserver and public-hostname requirements.

## Configure the VM

Verify the VM's Linux distribution, Tailscale connectivity, Docker Engine, Compose plugin, available disk, and automatic boot before deployment. Copy `compose.yaml` and `.env.example` to `/opt/just-because/deployment/app`; create a private `.env` there from `.env.example` and set file permissions to `600`. Set `APP_DOMAIN`, `BETTER_AUTH_URL`, and `APP_BASE_URL` to `justbecause.site`; use the production Neon URLs, a unique `BETTER_AUTH_SECRET`, and a generated `CRON_SECRET`. Add the remotely managed tunnel token as `TUNNEL_TOKEN`. Do not commit or paste secrets into chat. Create the tunnel token from Cloudflare's remotely managed tunnel setup and store it only in this private `.env`.

Configure production R2 values: `MEDIA_STORAGE_PROVIDER=r2`, `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_PUBLIC_URL=https://media.justbecause.site`. Use a bucket-scoped token for app writes/deletes and attach the media hostname to the R2 bucket. Uploads pass through the app to enforce permission, type, and size checks; the current request cap is about 50 MiB. Avoid overlapping large uploads and watch VM memory. Set `R2_PUBLIC_URL` in GitHub Actions build variables and `VITE_R2_PUBLIC_URL` in Vercel so existing shared media can be validated. Keep Vercel Blob configured only for Vercel uploads; configure R2 deletion credentials there only if that deployment needs to delete R2 media.

## Build, migrate, and start

Build and publish images in GitHub Actions, not on the 4 GB VM. The build workflow publishes `ghcr.io/janellereonal/just-because:sha-<commit>`. Confirm the package is public or configure a private GHCR pull credential on the VM with read-only package access. Connect to the VM over Tailscale, then use the approved immutable image tag:

```sh
cd /opt/just-because/deployment/app
docker pull ghcr.io/janellereonal/just-because:sha-<commit>
APP_IMAGE=ghcr.io/janellereonal/just-because:sha-<commit> docker compose --profile maintenance run --rm migrate
APP_IMAGE=ghcr.io/janellereonal/just-because:sha-<commit> docker compose --profile tunnel up -d --no-build --pull always
docker compose --profile tunnel ps
docker compose --profile tunnel logs --tail=100 app cloudflared
```

Before running migrations, verify the production database target and backup/recovery path. The migration service uses `DATABASE_URL_UNPOOLED` when set, otherwise `DATABASE_URL`. Configure the tunnel's origin as `http://app:8080` before starting the tunnel profile. For home production, the app is reachable only inside Docker and through the tunnel. The development-only `compose.local.yaml` publishes a loopback port for local previews; do not copy it to THEPC.

The `tunnel` Compose profile starts `cloudflared`; it does not expose Caddy ports or an app host port. Compose restart policies bring app and tunnel containers back after VM reboot. Check tunnel status in Cloudflare and container health with `docker compose --profile tunnel ps`. The tunnel token is a credential: limit access to the VM's `.env`, rotate the token if exposed, and do not reuse it in staging.

## Integrations and daily job

Set production OAuth redirect origins, verified email sender, PayMongo webhook at `https://justbecause.site/api/webhooks/paymongo`, and production secrets only after each provider is configured. Keep PayMongo in test mode until release acceptance passes. Optional analytics uses the GitHub Actions variables `VITE_POSTHOG_KEY` and `VITE_POSTHOG_REGION`.

Vercel Cron does not run on THEPC. Schedule the authenticated daily endpoint once per day using cron or a systemd timer. Store the cron secret in a root-readable environment file, not directly in shared crontab text. Validate the endpoint after HTTPS and the production `CRON_SECRET` are configured.

## Staging, rollback, and operations

Vercel Preview must use a separate Neon database, media write credentials, Better Auth secret and callback origin, PayMongo test credentials, safe email settings, and no production cron. Do not test staging against production data or delete production media.

For releases, publish an immutable image, SSH over Tailscale, pull the tag, review/backup before migrations, then restart the tunnel profile. Roll back by deploying the previous image tag if its schema remains compatible. Keep Lightsail and its existing Caddy workflow available until production smoke checks pass; do not delete it during cutover.

Monitor VM RAM, CPU, free disk, container health/restarts, tunnel connectivity, and upload reliability. Keep OS security updates enabled and maintain a tested restore path for Neon and R2. A 4 GB guest is a reasonable low-traffic starting point, not a capacity guarantee. After deployment verification, update the [THEPC rollout checklist](../../doc/plan/1793703335_thepc_vm_production_rollout.md) with actual results.

For local development, the optional `compose.local.yaml` maps the app to loopback only:

```sh
docker compose -f compose.yaml -f compose.local.yaml up -d --build
```
