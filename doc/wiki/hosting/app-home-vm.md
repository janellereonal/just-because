# Gift app on the THEPC VM

This guide describes the planned production shape for the Just Because gifting app. It is separate from the static documentation site served by the home-network preview. Follow the repository's [`deployment/app/README.md`](https://github.com/janellereonal/just-because/blob/main/deployment/app/README.md) for the detailed app deployment procedure. Do not treat this target as live until the rollout checklist records successful verification.

## Request path

```text
Visitors -> Cloudflare DNS/HTTPS -> outbound Cloudflare Tunnel
         -> cloudflared container -> app container -> Neon PostgreSQL
                                              \-> Cloudflare R2 media
```

The app and tunnel run in Docker Compose on the Linux VM (4 GB RAM, 50 GB storage). Neon stores application data; R2 stores uploaded media. The VM disk holds the operating system, Docker image layers, and logs. Build images in GitHub Actions and deploy immutable tags; do not compile images on the host.

## Network boundary

- Cloudflare Tunnel is the public ingress. The VM needs outbound access to Cloudflare but no router port-forwarding or public SSH rule.
- The app is attached to the private Compose network and does not publish port `8080` on the host.
- Use Tailscale for private SSH administration and manual deployments.
- Namecheap remains the registrar. Before moving authoritative DNS to Cloudflare, inventory and recreate existing records, especially email MX/TXT records. Keep the current Lightsail A record during this DNS-provider move; switch the app record to the Tunnel only after the connector and app pass checks.
- Cloudflare Free supplies authoritative DNS and Tunnel at $0/month for this setup. R2 is a separate service with usage-based pricing. Check [Cloudflare plans](https://www.cloudflare.com/plans/) and [R2 pricing](https://developers.cloudflare.com/r2/pricing/).
- Caddy remains configured for the Lightsail rollback profile; it is not part of the home VM tunnel path.

## Operations and rollout state

Keep the tunnel token and production `.env` on the VM with restrictive permissions. Run migrations only after verifying the Neon target and backup. Keep Vercel staging isolated from production database, R2 credentials, auth, payment, email, and cron settings. Monitor memory, disk, container restarts, tunnel health, and upload reliability; the app can receive uploads up to about 50 MiB and buffers them before writing to R2.

DNS cutover, production smoke checks, and staging isolation are tracked in `doc/plan/1793703335_thepc_vm_production_rollout.md` (planning document, not published in the portal). Lightsail remains available as rollback until the home deployment is verified.
