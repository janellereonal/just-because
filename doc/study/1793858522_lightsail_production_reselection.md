# Study: Use AWS Lightsail for Just Because production

## Prompt and decision

Re-select the existing AWS Lightsail instance as the production host instead of the THEPC Ubuntu VM. Adapt the current THEPC deployment and rollout guidance to the provisioned Lightsail instance. The owner asked whether Caddy is still needed and requested that the rollout plan target Lightsail.

## Current project and hosting state

- The application is a Node/TanStack Start/Nitro server packaged for Docker Compose. The stack includes an app service, a `public` profile with Caddy, a Cloudflare Tunnel profile, and a one-shot database migration service.
- The Caddy profile listens on host ports 80 and 443, reverse-proxies to `app:8080`, and keeps certificate/configuration state in named volumes. The app port is not published directly by the base Compose file.
- The existing Lightsail plan records instance `just-because-prod` in Sydney (`ap-southeast-2`), on the $7/month 1 GB RAM, 2 vCPU, 40 GB SSD, 1 TB transfer plan, with static IPv4 `15.135.147.111`.
- The intended existing services remain Neon PostgreSQL and Cloudflare R2; Vercel Preview is staging and must use isolated credentials and data.
- The AMD64-only immutable GHCR image for commit `e63b97a2f58de6aa8b21444cb522405f354c7110` was built for the x86_64 THEPC VM. Verify whether Lightsail can use this exact image architecture before deployment; do not assume a later app commit or image is published.
- The app has been started privately on THEPC and returned HTTP 200 through loopback/SSH forwarding. That is not a production launch and does not verify Neon, R2, migrations, domain routing, or public user flows.
- Current domain registration is at Namecheap. Prior rollout notes say its DNS is Namecheap BasicDNS and the domain pointed elsewhere at that time. Confirm current records before changing any DNS.

## Feasibility and decision

Caddy is needed for the selected Lightsail route if Lightsail itself will receive public HTTP/HTTPS traffic directly. Point the app hostname's DNS A record to the Lightsail static IPv4, allow inbound TCP 80 and 443 in the Lightsail networking firewall, and run the Compose `public` profile. Caddy obtains and renews the HTTPS certificate and forwards traffic to the app over the private Compose network. Port 8080 stays unexposed to the internet. Keep SSH restricted to the owner's administration source; Tailscale remains the preferred administration path where configured.

A Cloudflare Tunnel is unnecessary for this Lightsail architecture. Cloudflare DNS is still needed if a custom R2 media domain is to be served from the bucket, but this is separate from application ingress; the registrar can remain Namecheap. Preserve all mail and domain verification records if DNS hosting is moved.

The $7 Lightsail plan is the previously selected low-cost starting size. Its 1 GB RAM requires monitoring, especially for uploads that pass through the app and can buffer up to about 50 MiB. Build images in GitHub Actions and pull immutable tags. Keep Neon and R2 external so the VM disk is not the durable database/media store. Confirm production DB identity and recoverability, compare schema migrations, then apply migrations only after a restorable backup is verified.

Keep THEPC as a private non-production environment unless the owner later assigns it another role. Its local `.env` and current deployment are not a Lightsail production configuration and must not be copied blindly. Keep Vercel Preview isolated from production.

## Recommended execution sequence

1. Verify Lightsail instance identity, region/plan, static IP attachment, OS/architecture, Docker/Compose, disk, and available memory. Inspect firewall rules and confirm only intended ports will be open.
2. Select the exact immutable AMD64 image to deploy. Keep the Lightsail `.env` private, with the production Neon and R2 values and canonical app/media URLs. Do not copy the home VM environment wholesale.
3. In Neon, identify the production project/branch/database, verify a recent usable backup/restore point, and review migration compatibility with the current production app. Do not migrate until those checks pass.
4. Start the Lightsail app privately, verify container health and Neon connectivity, then apply the reviewed migration once if the target schema needs it.
5. Configure DNS to the Lightsail static IP only after confirming the intended app hostname and all current records. Open TCP 80/443 in Lightsail networking and start the `public` Compose profile so Caddy can serve HTTPS.
6. Verify authentication, gift and contribution flows, R2 upload/read/delete and media delivery, payments in test mode, email links, and scheduled jobs. Observe memory, disk, and container restarts under expected traffic.
7. Keep Vercel and THEPC available during validation, retain the previous image for rollback, then update the README and hosting wiki with verified deployment evidence.

## Review limits

This study is based on the repository's existing rollout notes and deployment files. No Lightsail console state, current Namecheap DNS records, Neon restore point, migration, production credentials, or public endpoint was inspected in this pass. The actual Lightsail OS and available image tag/architecture must be reconfirmed before deployment.
