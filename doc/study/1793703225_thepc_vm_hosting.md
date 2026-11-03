# Study: Host Just Because on the THEPC VM

## Prompt and decision

Replace the planned Lightsail production host with the owner-created Linux VM on THEPC (4 GB RAM, 50 GB storage). Keep the public site at `justbecause.site`, retain Vercel Preview as staging, and use Cloudflare Tunnel for public ingress with Tailscale for administration. This study records feasibility and tradeoffs before updating the rollout task board and deployment guidance.

## Current project and hosting state

Cloudflare's Free website plan currently includes authoritative DNS at $0/month, and Cloudflare Tunnel is available on all plans. The domain registration remains at Namecheap; only DNS hosting moves. R2 is separately priced based on storage and request usage.

- The application is a Node/TanStack Start/Nitro server already packaged for Docker Compose. The stack has an app container, a Caddy profile for public VPS ingress, and a one-shot migration service.
- Production PostgreSQL is external (Neon); media is designed for Cloudflare R2. Uploads pass through the app and are capped at about 50 MiB per request. Media should not consume the VM's 50 GB disk.
- GitHub Actions builds immutable GHCR image tags. The existing deployment workflow SSHes directly to Lightsail; that is not suitable for a home VM when public inbound SSH is intentionally avoided.
- The previous rollout assigned `justbecause.site` to Lightsail's static IP `15.135.147.111`; Namecheap is the registrar and was used for DNS. The Lightsail deployment is not yet verified and remains the rollback target.
- The user reports the new THEPC VM has 4 GB RAM, 50 GB storage, and a successful Ubuntu 26 installation. Verify the exact release (`lsb_release -ds`), CPU architecture (`uname -m`), Docker/Compose, and Tailscale connectivity on the VM before deployment. The Mac-built test image is ARM64 and is not presumed compatible with THEPC.

## Feasibility and tradeoffs

A 4 GB Linux guest is a more comfortable starting point than the previous 1 GB Lightsail plan for the app, Docker, and a small tunnel connector at low expected traffic. It is not a measured capacity guarantee: app-proxied uploads can occupy memory, and concurrent large uploads can still cause pressure. Build in CI and pull immutable images so image compilation does not consume VM resources. Monitor guest memory, disk, restarts, and uploads before treating the size as proven.

A remotely managed Cloudflare Tunnel provides a public hostname through outbound connector traffic and does not require a public VM address, router port-forwarding, or inbound SSH. Cloudflare documents Docker execution with a tunnel token and DNS routing through a proxied CNAME to the tunnel. The tunnel token is a credential and must stay in the VM's private environment. For the root domain, the reliable planned path is to make Cloudflare authoritative DNS; preserve and verify all existing MX, TXT, and other records during the Namecheap nameserver change. Cloudflare Tunnel can publish an application without a paid Access plan; Access policies are optional and should not be applied to the public gifting site.

Keep Cloudflare Tunnel as the only public ingress on the VM. The app listens only on the Docker network; do not publish port 8080 or public SSH. Use Tailscale for owner administration and manual image pulls/deploys. Cloudflare terminates public HTTPS and carries requests through the tunnel, so the VM's Caddy profile is unnecessary for the home deployment but should remain available for Lightsail rollback.

Neon and R2 remain external, avoiding local database and media-disk growth. Vercel Preview remains staging only after its database, media, auth, email, and payment settings are isolated from production. Migrations must be backed up and reviewed before applying to the shared production database. DNS cutover follows successful tunnel health and app smoke checks; retain Lightsail until rollback is no longer needed.

## Recommended execution sequence

1. **Prepare backend privately:** verify VM OS/architecture, Tailscale access, Docker/Compose, storage, and reboot behavior; keep all inbound router/firewall ports closed.
2. Publish a compatible immutable GHCR image, create a private production `.env`, confirm Neon/R2 configuration, and back up production data.
3. Review and apply database migrations deliberately, start the app without public ingress, and check health/backend connectivity through the private admin path.
4. **Later, publish the site:** choose Cloudflare Tunnel or a VPS relay, configure canonical auth/media/payment/email URLs and callbacks, then perform DNS changes only after the route passes checks.
5. Smoke-test key flows, monitor VM capacity, retain Lightsail through validation, and update the task board and living hosting docs with verified state.

## Review limits

No connection to THEPC, VM OS check, image pull, migration, DNS change, or production smoke test has been performed as part of this study. A local ARM64 image smoke check returned HTTP 200 using dummy database settings; it was removed and did not contact production. Cloudflare zone ownership, tunnel token, R2 setup, production service credentials, and isolated Vercel Preview resources remain to be verified. Cloudflare Tunnel documentation confirms the outbound tunnel and public-hostname model; actual DNS cutover and home-ISP reliability have not been tested.
