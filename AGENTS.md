# Repository Guidelines

## Ground Rules

For code changes, suggest a Conventional Commit (`feat:`, `fix:`, `chore:`, or `build:`), keep the work scoped to one clean commit, and explain the scope. Ask before expanding it. Store studies, plans, and living wiki docs in `doc/study/`, `doc/plan/`, and `doc/wiki/`. Follow **study → plan → execute → rendezvous → sync docs**: write a prompt-specific study first, then create the agreed task board after approval. If the strategy changes, update the study before the plan.

## Common Tasks

- **Study:** Fetch the timestamp with `date +%s` immediately before writing `doc/study/{timestamp}_{topic}.md`; write no other files in that task. Use a directory for multi-file studies. Commit with `docs:`. A `NOTE:` is a human annotation.
- **Plan:** Write `doc/plan/{timestamp}_{topic}.md` as an editable task board. Commit with `docs:`. Put prominent `OPEN QUESTIONS` near the top when human input is needed, then fold answers into the plan.
- **Execute:** Work through an existing plan, updating it as progress is made. Generally use a new branch; continue until complete or blocked.
- **Rendezvous:** Leave the codebase workable, merge completed plan changes to `main`, and update living docs to match the resulting code.
- **Collect commit:** Commit outstanding work with an appropriate Conventional Commit message.

## Project Structure & Commands

- `src/routes/` contains TanStack file routes; `src/server/` contains server-only code; `src/lib/` holds shared logic. `public/` stores assets, `drizzle/` holds schema and migrations, and `scripts/` contains maintenance tasks.
- `docs/` contains existing project notes. `doc/wiki/` is the VitePress documentation portal; studies and plans stay outside the published site.
- `bun run dev` starts the app; `bun run build` builds it; `bun run lint` runs ESLint; `bun test src` runs tests.
- `pnpm --dir doc/wiki docs:dev` previews the portal; `pnpm --dir doc/wiki docs:build` generates its static files.

## Style, Tests & Reviews

Follow the repository Prettier and ESLint settings. Use PascalCase for React components, camelCase for functions and variables, and kebab-case Markdown names. Add focused regression tests for behavior changes using `.test.ts` or `.test.tsx`; no coverage threshold is set. Pull requests should describe the change and motivation, list checks run, link issues when relevant, and include screenshots for visible UI changes. Keep credentials in ignored `.env` files; never publish application secrets in docs or Docker images.
