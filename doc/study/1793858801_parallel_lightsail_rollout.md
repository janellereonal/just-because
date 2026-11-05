# Study: Run an optional Lightsail deployment alongside THEPC

## Prompt and decision

Correct the previous Lightsail re-selection: THEPC remains a production deployment target and AWS Lightsail is an optional second deployment to run in parallel. The owner intends to deploy both at the same time. This study distinguishes parallel installation and validation from routing public user traffic to both hosts.

## Current deployment shape

- THEPC is a Linux VM already running the immutable AMD64 app image privately. Its app container reports healthy and responds HTTP 200 via loopback and a Tailscale SSH forward. The planned public route is Cloudflare Tunnel.
- Lightsail is recorded as `just-because-prod` in Sydney (`ap-southeast-2`), with a $7/month 1 GB RAM, 2 vCPU, 40 GB SSD, 1 TB transfer plan, and static IPv4 `15.135.147.111`. Its current runtime, firewall, and DNS state must be rechecked.
- The Compose repository has an app service, a public Caddy profile (ports 80/443, proxy to `app:8080`), a Cloudflare Tunnel profile, and a one-shot migration service.
- Neon PostgreSQL and R2 are external durable services; Vercel Preview remains staging and must remain isolated.

## Feasibility and operating boundaries

Both app containers can run concurrently using the same immutable application image. Lightsail can serve a validation hostname through Caddy while THEPC serves the selected canonical hostname through Cloudflare Tunnel. This allows both deployments to run and be checked in parallel without sending customer traffic to both automatically. Two deployments do not by themselves create load balancing or failover.

If both instances connect to the same production Neon database and R2 bucket, their application writes affect the same live data. They must use compatible image/schema versions and matching auth/session secrets where shared sessions are expected. Apply a production schema migration once only; do not run the one-shot migration independently on both hosts. Run the daily job on exactly one host to avoid duplicate execution. Keep payment webhooks and canonical email/OAuth URLs directed to the chosen canonical hostname until multi-host behavior is verified.

Caddy remains useful on Lightsail because it can terminate HTTPS and proxy requests to the app over the Compose network. The app's port 8080 remains private. Caddy is not required on THEPC when Cloudflare Tunnel forwards to the app. A Lightsail validation subdomain can point to its static IP while the root domain continues to THEPC. Namecheap can remain the registrar. If authoritative DNS is moved to Cloudflare for the R2 custom domain, preserve and verify existing mail and verification records.

The $7 Lightsail plan has 1 GB RAM and is less forgiving than THEPC's 4 GB VM, especially for app-proxied uploads. Monitor memory, swap, disk, OOM events, and restarts before treating Lightsail as a reliable production standby. Neon and R2 keep database rows and media off the Lightsail disk.

## Recommended execution sequence

1. Keep the THEPC rollout as the primary production checklist. Add Lightsail as a separate optional parallel track; do not mark the THEPC plan superseded.
2. Recheck Lightsail instance, static IP, architecture, Docker/Compose, firewall, and capacity. Publish and pull one successful immutable AMD64 image for both hosts.
3. Verify the production Neon project and restore point; compare pending schema migrations against the running app. Back up and apply migrations at most once, before either host depends on the new schema.
4. Create a separate Lightsail `.env`; never copy THEPC's `.env` blindly. Match approved production Neon/R2/auth values only if Lightsail is intended to access the same production accounts and data.
5. Start the Lightsail app privately, verify health and backend connectivity, then enable Caddy with TCP 80/443 after a validation hostname resolves to the static IP. Keep port 8080 private.
6. Keep THEPC on the canonical hostname while validating Lightsail through a distinct hostname. Keep the daily job on THEPC and webhook/canonical email routing on the designated canonical host.
7. Smoke-test and monitor each host independently. Both may run concurrently, but preserve one canonical user-facing route until the owner approves any traffic split or failover design.

## Review limits

This study uses repository rollout records and prior user-provided verification for THEPC. It does not verify current Lightsail console state, current public DNS, production Neon restore availability, R2 operations, or application behavior on Lightsail. No traffic routing, production migration, or server setting is changed by this study.
