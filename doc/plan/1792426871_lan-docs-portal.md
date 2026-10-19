# Plan: LAN Documentation Portal and Future Hosting

## Objective

Deliver a useful, static documentation portal in `doc/wiki/`. Preview it from `THEPC` over the home LAN and document container deployment for a future Linux VPS or EC2 host. Keep the existing `docs/` notes, Just Because application, and Vercel deployment unchanged.

## Task Board

- [x] Add an isolated VitePress package under `doc/wiki/` with a pnpm lockfile.
- [x] Configure the `doc/wiki/` site with project branding, local search, accessible responsive navigation, and a curated sidebar.
- [x] Create a clear home page and hosting guide in `doc/wiki/`, separate from internal notes and prompt files.
- [x] Add a reproducible Windows LAN preview script that serves the built static output on the host's LAN interface.
- [x] Add a Docker/Nginx deployment recipe for a Linux VPS and EC2, including port/firewall and update instructions.
- [x] Update root `AGENTS.md` with the actual repository structure and commands; sync README documentation links.
- [x] Build the docs site and inspect its output for the required pages.
- [x] Copy the build to `THEPC`, start the LAN server, and request the site from the host and development machine.
- [x] Commit the site as one `feat:` change, keep study/plan documents in `docs:` commits, and report the LAN address and hosting steps.

## Implementation Notes

The docs site uses `doc/wiki/` as its VitePress root, separate from the internal notes under `docs/`. The Windows preview must serve only `doc/wiki/.vitepress/dist`; it must not run the full app or expose environment files. The Docker image should also contain only the built static site and Nginx configuration.

## Verification and Rendezvous

`pnpm --dir doc/wiki install --frozen-lockfile` and `pnpm --dir doc/wiki docs:build` succeeded. The generated home, hosting overview, architecture, LAN, VPS, EC2, operations, and favicon files are present; session notes and machine-specific paths are absent. The PowerShell server returned HTTP 200 for the home, LAN, and EC2 pages from the development machine over the LAN. The Windows Firewall rule for TCP 8088 is limited to `LocalSubnet`. The Docker recipe is documented but could not be built here because neither available host has Docker installed. After this plan update is committed, merge the completed branch into local `main` as specified by the repository workflow, preserving the feature branch and its commits; do not push `main` because it deploys the app.
