# Plan: Deploy Just Because to Lightsail Sydney ($7 starter)

Supersedes `1792935685_lightsail_r2_feature_parity.md` for the actual rollout. The earlier document remains as the original approved architecture record; this task board reflects the provisioned server and current application implementation. Feasibility and tradeoffs are recorded in [`doc/study/1793613200_lightsail_sydney_1gb_deployment.md`](../study/1793613200_lightsail_sydney_1gb_deployment.md).

## OPEN QUESTIONS

- Should the initial Lightsail deployment use `app.justbecause.site` for validation, or should `justbecause.site` be switched from its current destination after validation?
- Is an R2 bucket already available? The public DNS currently uses Namecheap BasicDNS, so R2 custom-domain delivery would require either moving DNS to Cloudflare while preserving existing records or a Cloudflare Business/Enterprise partial setup.
- Are the Google OAuth, email, analytics, and PayMongo production credentials/configuration available for the chosen hostname? Keep all secret values in a private environment file or provider secret store; do not add them to this plan or chat.

## Objective

Deploy the existing TanStack Start/Nitro app on the owner-created Lightsail instance `just-because-prod` in Sydney (`ap-southeast-2`), using the selected $7/month 1 GB bundle, Docker Compose, Caddy, the existing managed PostgreSQL database, and Cloudflare R2 for shared media. Keep the Vercel deployment available for rollback.

## Task board

- [x] Provision Lightsail instance in Sydney with Ubuntu 24.04.5 LTS, dual-stack networking, and the $7 / 1 GB / 2 vCPU / 40 GB / 1 TB plan.
- [x] Apply Ubuntu updates and reboot; Docker Engine and Compose were installed and `hello-world` ran successfully.
- [x] Review branch and deployment source. At review start `codex/just-because-work` was clean and three commits ahead of origin; this documentation update adds a further local commit. The local application build and image build remain unverified because Bun/Node and the local Docker daemon are unavailable.
- [x] Record that the instance runs in Sydney, the actual plan size, the production config gaps, and the memory tradeoff for app-proxied large uploads.
- [x] Attach Lightsail static IPv4 `15.135.147.111` to `just-because-prod`.
- [ ] Confirm Lightsail firewall access: restrict SSH to the owner’s administration source; allow TCP 80/443 for Caddy, with UDP 443 optional.
- [ ] Configure an app hostname after choosing between `app.justbecause.site` for validation and a later root-domain cutover. Public DNS currently uses Namecheap BasicDNS; `justbecause.site` currently resolves to `216.198.79.1`, so preserve that record until cutover is explicitly intended.
- [ ] Confirm/create the R2 bucket and choose its custom-domain DNS route. Keep write/delete credentials scoped to that bucket.
- [x] Update deployment guidance to the created Sydney/$7 instance and clarify that browser upload CORS is not needed because uploads pass through the app.
- [ ] Prepare `/opt/just-because/deployment/app/.env` on the server with production-only values. Database URLs exist in the local ignored env file, but the production auth secret, hostname, and R2 values are currently missing. Keep secrets out of Git and container image build args.
- [ ] Configure Google auth origins, email delivery/from address, PayMongo production callback/webhook settings, analytics build variables as desired, and a strong `CRON_SECRET` for the authenticated daily job.
- [x] Push the current branch to GitHub (`8522535bc55ab47b77d545bfc855a4838447ccef`).
- [ ] Manually run the image-build workflow for this branch/commit from GitHub Actions; then inspect the build result and ensure the immutable GHCR image is pullable by the VPS (public package or configured registry credentials). The build has not been triggered yet.
- [ ] Validate the image’s start and health check before touching production data. Confirm the Node migration command works in the runtime image.
- [ ] Run the explicit database migration only after validating the production DB target and confirming a backup/recovery path.
- [ ] Deploy the immutable image with Compose and Caddy. Verify DNS, automatic HTTPS, app health, sign-in, gift flows, uploads/media delivery and deletion, admin theme uploads, payment callback/webhook, email links, and daily endpoint.
- [ ] Keep Vercel as rollback until smoke checks pass. Monitor RAM, swap, container restarts, CPU, disk, and upload behavior on the 1 GB plan; upgrade to the 2 GB plan if the metrics show memory pressure.
- [ ] Record release evidence and update living hosting documentation after successful deployment.

## Decisions and guardrails

- Use the existing server and managed PostgreSQL; do not create another database or move existing media as part of this rollout.
- Build and tag images in GitHub Actions, not on the 1 GB VPS. Deploy an immutable `sha-<commit>` image.
- Keep port 8080 private behind Caddy. Keep app `.env` private and separate from repository source.
- R2 uploads pass through the Node app for actual size/type enforcement. This may cause transient RAM pressure for concurrent large files on 1 GB; begin with low expected traffic and use monitoring to decide whether to resize.
- Do not apply database migrations, switch payment credentials to live mode, or change public DNS until the relevant production values and recovery steps are confirmed.
- No app build, test suite, Docker image build, migration, or public smoke test has passed in this review. Record actual CI and release results on this task board as the work proceeds.
