# Plan: Isolate Staging and Launch Production on Lightsail

This task board follows the approved strategy in [`doc/study/1793679427_staging_production_handoff.md`](../study/1793679427_staging_production_handoff.md): Vercel Preview is staging; Lightsail serves production. Keep this document updated as work progresses.

## OPEN QUESTIONS

- Which managed PostgreSQL provider/database should supply the isolated staging database (or branch)? Do not reuse the production connection.
- Is Cloudflare R2 already set up? Confirm whether production DNS hosting will move from Namecheap to Cloudflare, or whether another approved production media path is needed. R2 custom-domain access requires the domain to be present in the Cloudflare account that owns the bucket.
- Are the production OAuth, email, analytics, PayMongo, and cron settings ready? Keep secrets in private environment files or provider secret stores, never in this plan or chat.
- The root DNS A record already points to Lightsail `15.135.147.111`, while the app has not yet been deployed. Confirm the live result and keep the former DNS target recorded for rollback.

## Target Environments

| Environment | Host | Runtime | Data and integrations |
|---|---|---|---|
| Staging | Protected Vercel Preview URL | Vercel Preview deployment from the staging branch | Separate staging database and media storage, test auth, PayMongo test mode, safe email, no production cron |
| Production | `https://justbecause.site` | Docker Compose and Caddy on Lightsail `just-because-prod` in Sydney (`ap-southeast-2`) | Existing production PostgreSQL, production media storage, production-only secrets and integrations |

The domain remains registered with Namecheap. Public DNS currently uses Namecheap BasicDNS. The root A record resolves to `15.135.147.111`; `app.justbecause.site` was NXDOMAIN when checked. Do not create or register a duplicate domain in Lightsail or Route 53.

## Task Board

### 1. Establish staging isolation

- [ ] Confirm GitHub-to-Vercel integration and use Vercel Preview deployments for the staging branch.
- [ ] Enable Vercel Authentication protection for Preview deployments.
- [ ] Create a separate staging PostgreSQL database or isolated branch; verify its connection target is distinct from production without exposing credentials.
- [ ] Configure Preview-only variables, including staging database URL, unique Better Auth secret, staging app origin/OAuth callback, safe email, and disabled production cron.
- [ ] Configure staging media independently (separate R2 bucket or a separate Vercel Blob token/provider); never allow staging writes/deletes against production media.
- [ ] Configure PayMongo test credentials only and keep live keys out of Preview.
- [ ] Build a Preview deployment from `codex/just-because-work` and record its URL and build result.
- [ ] Apply/test database migrations against staging only, then smoke-test sign-in, gift CRUD, contributions, uploads/media, admin theme uploads, and payment/email test flows.

### 2. Prepare production host and release image

- [x] Provision the Sydney Lightsail Ubuntu 24.04.5 instance on the $7/month 1 GB plan; install Docker Engine and Compose and verify with `hello-world`.
- [x] Attach static IPv4 `15.135.147.111` to `just-because-prod`.
- [ ] Confirm current public behavior at `justbecause.site`; record the prior DNS A value (`216.198.79.1` was observed before the change) and a rollback procedure.
- [ ] Verify Lightsail and host firewall rules: permit TCP 80/443 for Caddy; restrict SSH to the owner’s administration IP; keep app port 8080 private.
- [ ] Confirm a production media path. For R2, create a bucket and scoped credentials, set `R2_PUBLIC_URL`, and arrange Cloudflare custom-domain/DNS setup while preserving Namecheap registration and other DNS records.
- [ ] Prepare `/opt/just-because/deployment/app/.env` on Lightsail with production-only values: `APP_DOMAIN=justbecause.site`, auth origin/base URL, production database connections, storage credentials, unique auth/cron secrets, and required integrations.
- [ ] Configure Google OAuth for the production origin, email sender, production PayMongo callback/webhook, optional analytics build variables, and scheduled daily job. Keep live payment keys disabled until release checks pass.
- [ ] Manually run the GitHub Actions image-build workflow for the approved commit; verify the image is tagged immutably and pullable from GHCR.
- [ ] Run the requested lint, unit tests, and production build in CI; resolve failures before deploying.
- [ ] Pull and validate the image health check and migration command without changing production data.

### 3. Release and verify production

- [ ] Confirm a current production database backup and tested recovery procedure.
- [ ] Review migrations for compatibility with the existing Vercel production version so rollback remains possible.
- [ ] Run explicit migrations against production only after backup and target confirmation.
- [ ] Start the production Compose app and Caddy; confirm certificate issuance and `https://justbecause.site` health.
- [ ] Smoke-test sign-in, gift creation/editing, contributions, photo/thumbnail/voice/video uploads, media loading/deletion, admin theme uploads, PayMongo sandbox/webhook behavior, email links, and cron endpoint before live payment keys.
- [ ] Keep the former DNS target and previous working deployment available until all production checks pass. Use the recorded target if DNS rollback is needed and approved.
- [ ] Monitor RAM, swap, CPU, disk, container health/restarts, and upload behavior on 1 GB; resize to 2 GB if measurements show sustained pressure or instability.
- [ ] Record release evidence and sync `deployment/app/README.md` and living wiki documentation to the verified production state.

## Release Guardrails

- Staging and production must never share a database, storage write credentials, auth secrets, payment keys, email delivery configuration, or scheduled production job.
- Build images in GitHub Actions; do not build on the 1 GB VPS. Deploy immutable `sha-<commit>` tags.
- Keep port 8080 private behind Caddy. Never commit `.env` files or secrets.
- Run migrations deliberately and separately for staging and production.
- Do not change domain nameservers or add/delete production DNS records without first copying and reviewing all existing records, including email records.
- Current branch: `codex/just-because-work`. The existing Lightsail deploy workflow targets one production environment; staging is planned on Vercel Preview and is not configured yet.
