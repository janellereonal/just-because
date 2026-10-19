# Study: Add a Repository Contributor Guide

## Prompt and scope

Add a root `AGENTS.md` for contributors to the Just Because repository, using the requested “Repository Guidelines” structure and the workflow rules supplied by the maintainer. Keep the change isolated to a contributor guide. The branch `codex/just-because-work` tracks `origin/main`.

## Current state

The repository is a TanStack Start application using React, TypeScript, Vite, Tailwind, Drizzle, and Bun. The root contains `src/`, `public/`, `drizzle/`, `scripts/`, `tools/`, `docs/`, `package.json`, and an extensive `CLAUDE.md`. `package.json` defines `bun run dev`, `bun run build`, `bun run lint`, `bun test src`, and database migration/seed scripts. The README directs contributors to `CLAUDE.md`, which already describes architecture, data-access rules, operational commands, and security-sensitive payment behavior. There is no tracked root `AGENTS.md` on `origin/main`.

## Feasibility and tradeoffs

Adding `AGENTS.md` is low-risk and feasible as a documentation-only change. It can provide concise, agent-facing contributor rules, accurate project layout and everyday commands, formatting/testing expectations, and Conventional Commit/PR guidance. The maintainer’s study/plan/execute/rendezvous/sync workflow and document locations (`doc/study/`, `doc/plan/`, `doc/wiki/`) should be represented as actionable instructions.

The main tradeoff is duplication: copying architecture and sensitive payment details from `CLAUDE.md` would make the guides drift. Keep `AGENTS.md` around 200–400 words, summarize the workflow and repository-specific basics, and point readers to `CLAUDE.md` and the relevant `docs/` files for deeper guidance. The repository currently uses `docs/` (plural) for existing living documentation, while the supplied workflow explicitly reserves `doc/` (singular) for studies, plans, and wiki documents; the guide should preserve that distinction rather than relocate existing documentation.

The task is cleanly scoped as a single documentation change and can use a `docs:` Conventional Commit. No code changes or additional tooling are needed. The strategy can be implemented after approval; the guide should reflect current commands and explicitly avoid asserting unsupported coverage or PR requirements as existing policy.

## Recommendation

Proceed with a short, repository-specific root `AGENTS.md`. Keep maintainer workflow rules authoritative, describe the actual Bun commands and source/test locations, and refer to `CLAUDE.md` for the application’s detailed architecture and safeguards.
