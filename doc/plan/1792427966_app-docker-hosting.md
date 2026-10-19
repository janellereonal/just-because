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

Implemented Docker and Compose files, a private environment template, and the operator guide; linked it from the repository README. Docker CLI exists but Docker Compose plugin is unavailable, and registry access is blocked in this environment, so neither image build nor app dependency build could be completed here.
