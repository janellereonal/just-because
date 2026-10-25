# Study: Lightsail, R2, and self-hosted feature parity

## Prompt and scope

Prepare the current Docker deployment for an affordable public production host while preserving the Vercel deployment and application behavior. Evaluate Lightsail in Singapore, external object storage, and the gaps between the Vercel and self-hosted runtime. This study does not provision cloud resources or expose a public endpoint.

## Current state

The active branch shares the same application source as `main`; its differences are the Docker/Caddy deployment and documentation. The app is TanStack Start/Nitro on Node, backed by PostgreSQL. Production uploads currently use Vercel Blob; local/self-hosted uploads fall back to a persistent Docker volume. Media URL validation, CSP, and cleanup recognize Vercel Blob and local-development paths. Vercel Cron invokes the authenticated daily job, while self-hosting requires an external scheduler. The Docker deployment already has an explicit migration service, Caddy HTTPS profile, and environment template.

## Feasibility and tradeoffs

Lightsail's current public IPv4 Linux bundle is $12/month for 2 GB RAM, 2 vCPUs, and 60 GB disk. The published transfer allowance is 3 TB; AWS notes that some regions receive half allowances, but Singapore is not among the listed reduced regions. Two GB is a suitable initial runtime target if image builds happen in CI rather than on the host. Keep the existing managed PostgreSQL service to avoid coupling database uptime and recovery to the app VPS.

Cloudflare R2 is a good low-cost media store for an active public-upload workload: 10 GB-month storage, one million Class A operations, and ten million Class B operations are included monthly, and internet egress is free. R2's S3 API enables direct browser uploads using short-lived presigned URLs. This requires a Cloudflare-managed custom media hostname, bucket CORS/public-delivery configuration, environment secrets, and code updates. Preserve old Vercel Blob URLs and provider-aware deletion so the Vercel and VPS deployments can share existing records safely.

The principal parity gaps are provider-specific upload handling, media host validation/CSP/deletion, and the daily scheduled task. Authentication origins, email URLs, analytics build inputs, and payment callbacks must use the public app domain. Build immutable images in CI and deploy them to Lightsail so the small instance does not need to compile the large frontend bundle.

## Recommended direction

Use Lightsail Singapore (2 GB) for the Node app and Caddy, the existing managed PostgreSQL database, and Cloudflare R2 for user media. Retain Vercel Blob for the Vercel deployment, with both storage providers supported by shared application code. Keep app and media domains on controlled DNS, keep the Lightsail port 8080 private, and use a daily host scheduler for the existing authenticated cron endpoint. A 4 GB Lightsail instance is the fallback only if runtime measurement shows the 2 GB instance lacks headroom.

## Sources

- AWS: [Lightsail instance bundles](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html), [regional data-transfer allowances](https://aws.amazon.com/lightsail/pricing/)
- Cloudflare: [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [R2 S3-compatible access](https://developers.cloudflare.com/r2/get-started/)
