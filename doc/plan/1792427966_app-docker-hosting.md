# Plan: Docker deployment for the Just Because app

## Objective

Ship an app container and operator guide for LAN/VPS/EC2 hosting while preserving Vercel deployment and the docs portal stack.

## Task board

- [x] Add a multi-stage Dockerfile that builds Nitro's Node preset and runs the production server as an unprivileged user.
- [x] Add app Compose configuration with persistent upload storage, configurable port, health check, restart policy, and environment file.
- [x] Add safe ignore rules for image build context and local secrets/uploads.
- [x] Document environment setup, LAN access, VPS/EC2 ingress and DNS, external dependencies, migration, daily cron, backups, updates, and rollback.
- [x] Build the app with Node preset and validate Docker/Compose configuration when available.
- [x] Update this board with results and commit the scoped change as `feat: add self-hosted app deployment`.

## Decisions

Use existing PostgreSQL and service integrations; the container must not migrate or seed production data automatically. Local filesystem uploads persist in a named volume for single-instance operation. Vercel remains the default build target when its existing build command is used.

## Completion notes

Implemented Docker and Compose files, a private environment template, and the operator guide; linked it from the repository README. Compose configuration validates, and the image builds successfully. A runtime smoke test found a missing external `undici` dependency; the runtime stage now includes production dependencies. Rebuilt and verified the app returns HTTP 200 and passes its health check on the Mac; a second device (THEPC) also receives HTTP 200 over Tailscale. The checkout has no populated database URLs, so database-backed account, gift, and payment flows remain unconfigured. The guide runs migrations through an opt-in Compose maintenance service that reads the app env file; migrations remain excluded from normal startup.
