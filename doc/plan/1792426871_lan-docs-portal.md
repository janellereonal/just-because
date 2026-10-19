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
- [ ] Build the docs site and inspect its output for the required pages.
- [ ] Copy the build to `THEPC`, start the LAN server, and request the site from the host and development machine where routing permits.
- [ ] Commit the site as one `feat:` change, keep study/plan documents in `docs:` commits, and report the LAN address and hosting steps.

## Implementation Notes

The docs site uses `doc/wiki/` as its VitePress root, separate from the internal notes under `docs/`. The Windows preview must serve only `doc/wiki/.vitepress/dist`; it must not run the full app or expose environment files. The Docker image should also contain only the built static site and Nginx configuration.

## Verification and Rendezvous

Run `pnpm --dir doc/wiki docs:build`. Inspect generated routes and assets. Start the preview server on `THEPC` and check its HTTP response locally and from the development machine. Keep any firewall rule scoped to the private LAN and the docs port. After implementation and review, merge the completed branch into local `main` as specified by the repository workflow, preserving the feature branch and its commits.
