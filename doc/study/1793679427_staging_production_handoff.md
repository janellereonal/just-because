# Handoff Study: Separate Staging and Production for Lightsail

> **Superseded for the production host:** The owner selected the THEPC Linux VM with Cloudflare Tunnel. Use [`doc/study/1793703225_thepc_vm_hosting.md`](1793703225_thepc_vm_hosting.md) and [`doc/plan/1793703335_thepc_vm_production_rollout.md`](../plan/1793703335_thepc_vm_production_rollout.md) for the current target. Lightsail remains a rollback host until home deployment verification.

## Goal

Move the public Just Because site to AWS Lightsail while keeping a safe place to test changes. Staging must not change production data, send real payments, or use production secrets.

## Current State

- The Lightsail instance `just-because-prod` is in Sydney (`ap-southeast-2`) on the $7/month plan: 1 GB RAM, 2 vCPUs, 40 GB SSD. Docker and Compose were installed and verified with `hello-world`.
- Static IPv4 `15.135.147.111` is attached. Namecheap is still the registrar and currently authoritative DNS provider.
- The root A record `justbecause.site` now points to the Lightsail IP. The proposed `app.justbecause.site` record does not currently exist. The app has not yet been deployed, so DNS points at Lightsail before Caddy/app readiness.
- Branch `codex/just-because-work` contains Docker/Caddy deployment files and the R2 storage adapter. The build, image, migration, and production smoke checks have not been verified.
- The Lightsail deploy workflow targets a single production directory and environment. Staging isolation is not currently configured.
- The rollout uses managed PostgreSQL and proposes Cloudflare R2. The server environment, R2 bucket/domain, and production integration settings are not yet confirmed.

## Recommended Separation

- **Production:** `https://justbecause.site` on Lightsail, with its own production `.env`, production database, production media storage, production auth secret, and live integrations only after validation.
- **Staging:** Vercel Preview deployments, using generated Preview URLs and Preview-scoped configuration. Vercel supports separate environment variables for Preview and Production; protect preview deployments with Vercel Authentication. This avoids running a second app on the 1 GB Lightsail instance.
- **Data boundary:** Staging needs a distinct database (or isolated database branch) and separate media storage. Never point staging at the production database. Use payment sandbox credentials, test/suppressed email, a distinct auth secret and callback URL, and no production cron job.
- **Release boundary:** Test migrations against staging first. Back up production and review migration compatibility before production migration. Keep the previous deployment and DNS rollback information available until Lightsail passes smoke checks.

## Proposed Checklist for Review

### 1. Confirm the environment split

- [ ] Use Vercel Preview as staging; use Lightsail for production.
- [ ] Identify/create a separate staging PostgreSQL database or isolated branch.
- [ ] Choose separate staging media storage; confirm production R2 bucket and public hostname.
- [ ] Set Preview-only secrets and integrations: auth callback/secret, test payments, safe email, storage credentials, and no live daily cron.
- [ ] Enable protection for Vercel Preview deployments.

### 2. Validate staging

- [ ] Build the current implementation as a Vercel Preview deployment.
- [ ] Configure Preview variables to use only staging services and data.
- [ ] Apply/test migrations against staging only.
- [ ] Smoke-test sign-in, gift creation/editing, contributions, uploads/media, admin theme uploads, and payment/email test flows.

### 3. Prepare and release production

- [ ] Confirm the Lightsail firewall allows TCP 80/443 and restricts SSH to the owner’s admin source.
- [ ] Prepare the production `.env` privately on Lightsail; set the root domain and production database/storage credentials.
- [ ] Build and publish an immutable image in GitHub Actions; check that the image starts and passes health checks.
- [ ] Confirm production database target, backup/recovery path, and migration compatibility with the existing Vercel deployment.
- [ ] Run the production migration deliberately, then start the app and Caddy.
- [ ] Verify HTTPS and user flows on `justbecause.site`; configure production OAuth, payment webhook, email, and daily job only when their production settings are ready.
- [ ] Monitor memory, restarts, logs, disk, and uploads on the 1 GB VPS; keep a rollback path until checks pass.

## Tradeoffs and Blockers

Vercel Preview staging avoids adding app load to the small Lightsail server, but it requires a separate staging database and carefully scoped Preview variables. A separate staging media bucket is safest. Production R2 custom-domain delivery requires `justbecause.site` to be added to the same Cloudflare account as the R2 bucket; the current Namecheap DNS setup means DNS hosting options must be decided without losing existing records. This is a separate decision from pointing the production root A record at Lightsail.

The root DNS record already points to Lightsail while the service is not deployed. Avoid further DNS edits until the production endpoint is ready or a deliberate rollback is chosen. The immediate next step is agreeing on and setting up the staging database/storage, then validating the current branch on a protected Vercel Preview deployment.

## Decision Requested

Review the proposed checklist and confirm the environment split (Vercel Preview for staging, Lightsail for production) before turning it into the editable implementation task board.
