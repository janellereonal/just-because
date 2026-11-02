# Study: Lightsail Sydney deployment at the selected $7 size

## Prompt and scope

Reconcile the approved Lightsail/R2 deployment strategy with the server the owner has now created, and review whether the current branch and app are ready to deploy. This study records the current constraints and next decisions; it does not deploy the app, run a database migration, or expose a public endpoint.

## Confirmed current state

- At review start, the active branch `codex/just-because-work` was clean and three commits ahead of `origin/codex/just-because-work`. Those commits include Docker/Caddy, R2 support, deployment workflows, and prior studies/plans.
- The owner created `just-because-prod` in Sydney (`ap-southeast-2`), Ubuntu 24.04.5 LTS, with the $7/month general-purpose dual-stack bundle: 1 GB RAM, 2 vCPUs, 40 GB SSD, and 1 TB transfer. Docker Engine and Compose are installed and `hello-world` succeeded.
- The application remains Node/TanStack Start/Nitro, with PostgreSQL external to the VPS. R2 uploads are received by the app and stored in R2; Vercel Blob remains supported.
- The local ignored `deployment/app/.env` has pooled and unpooled database URLs, but production auth secret, app domain, and R2 configuration are unset. The VPS still needs its own private production `.env`.
- The current workspace has no Bun or Node runtime and no available Docker daemon. Therefore, the production app build and container health are unverified here. No application image has been built for the three unpushed commits.

## Feasibility and tradeoffs

The $7 instance is a reasonable low-cost starting point for the stated low-traffic gifting app because the database and media objects remain managed externally and CI is intended to build the app image. Its 1 GB RAM gives less operating headroom than the $12 / 2 GB option. Upload requests pass through the Node app and are buffered in memory (the app allows video uploads up to its configured limit), so overlapping large uploads can pressure memory. Start at $7 only with monitoring; move to 2 GB if the process restarts, memory remains tight, or uploads become unreliable.

Sydney is the region AWS assigned to this account's new console experience; the create-instance screen did not offer another region. This replaces prior planning assumptions about Singapore. The visible public IPv4 should be confirmed as static or replaced with an attached Lightsail static IP before setting DNS, since a default public address can change after stop/start. Keep SSH restricted to administration and expose only TCP 80/443 (UDP 443 optional) for Caddy.

The R2 implementation deliberately proxies uploads through the app so it can verify actual content and size before writing objects; browser CORS is not required for that upload path. The `media.<domain>` public hostname still must be attached to the R2 bucket for reads. Both the app hostname and media hostname, R2 credentials, auth origin/secret, email, analytics, PayMongo callback, and the scheduled daily endpoint need production configuration.

CI is the intended builder, but the application commits and subsequent documentation commits must be pushed before a GitHub Actions workflow can build that exact source. The GHCR image must be pullable by Lightsail (public package or server-side registry credentials). Deployment automation also needs its SSH credentials and known-hosts value. The migration service and release flow need validation against the selected production database before running a migration.

## Recommended direction

Proceed with the already-created Sydney $7 instance as a monitored starter. First align the implementation plan and deployment docs to Sydney/$7 and the actual app-proxied R2 design. Then confirm static IP and DNS, configure the production environment securely, publish the branch and build/inspect its immutable image in CI, verify the image and Compose stack, and only then perform a deliberate migration and deploy. Preserve Vercel as rollback until parity smoke checks pass. Do not put application secrets in Git, image build arguments, or chat.

## Review limits

The source/build workflow and Compose files were inspected, but no app build, tests, Docker image build, migration, or live app smoke check was run in this review. The workspace lacks Bun/Node and its Docker daemon is unavailable. R2, DNS, OAuth, email, PayMongo, and public HTTPS are not configured or verified.
