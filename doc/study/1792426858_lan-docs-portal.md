# Study: LAN Documentation Portal and Future Hosting

## Objective

Create a working documentation website from the repository’s existing public project docs, serve it to other devices on the home network from `THEPC` for now, and leave the branch ready for a later VPS/Docker or EC2 deployment.

## Findings

The repository is a TanStack Start app deployed to Vercel, with project Markdown under `docs/` and extensive application/deployment notes in root `CLAUDE.md` and `HANDOFF.md`. The `docs/` folder also contains session notes and prompt material that should not automatically become public site pages. The current branch is `codex/just-because-work`, based on `origin/main` with the earlier contributor-guide study committed.

SSH now reaches a Windows host named `THEPC` at LAN address `192.168.1.39`. It has Windows PowerShell and SSH, but no usable Node, Bun, Docker, or Python runtime. A static build can avoid adding a runtime dependency to that machine: generate the site on the development machine, transfer only its built assets, and serve them with a small PowerShell script bound to the PC’s LAN address. A later Linux VPS or EC2 deployment can serve the same assets through Nginx in Docker.

## Feasibility and tradeoffs

VitePress is suitable because it turns Markdown into a searchable static site, uses the repo’s existing Bun workflow, and supports a custom navigation sidebar. It adds a development dependency and site configuration but does not change the existing app’s routes or runtime. Source exclusions and a curated sidebar reduce the risk of exposing internal handoff and prompt documents when the site is later hosted publicly.

For the current Windows host, PowerShell’s built-in networking APIs avoid installing Node or Docker. This is appropriate for a temporary LAN preview, but it is not the intended internet-facing production server. The deployment guide should keep VPS and EC2 steps explicit about firewall rules, SSH key access, Docker, ports, and updating static content. VitePress docs are current and should be consulted for configuration and deployment details during implementation.

The work is feasible as one feature-sized change: add the docs site, a selected hosting guide, a Windows LAN serving script, and a container deployment recipe. Keep the existing gift app’s Vercel deployment untouched. Use a `feat:` commit for the site and `docs:` commits for the study/plan. The root `AGENTS.md` also needs its stale “empty repository” status corrected so it does not mislead contributors.

## Recommendation

Build a documentation portal rooted at `docs/`, include selected product/design pages and a new hosting guide, exclude internal notes and prompt files, and provide separate local-development, Windows LAN-preview, and Docker deployment instructions. Generate static files once and serve those files from `THEPC` on a private LAN port; avoid exposing the app database, payment configuration, or other environment variables.
