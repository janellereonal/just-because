# Plan: LAN Documentation Portal and Future Hosting

## Objective

Deliver a useful, static documentation portal based on the repository’s public project docs. Preview it from `THEPC` over the home LAN and document container deployment for a future Linux VPS or EC2 host. Keep the existing Just Because application and its Vercel deployment unchanged.

## Task Board

- [ ] Add VitePress scripts and development dependency using Bun; commit the lockfile update.
- [ ] Configure the `docs/` site with project branding, local search, accessible responsive navigation, and a curated sidebar.
- [ ] Create a clear home page and hosting guide. Exclude handoff/session notes and prompt files from the generated site.
- [ ] Add a reproducible Windows LAN preview script that serves the built static output on the host’s LAN interface.
- [ ] Add a Docker/Nginx deployment recipe for a Linux VPS and EC2, including port/firewall and update instructions.
- [ ] Update root `AGENTS.md` with the actual repository structure and commands; sync README documentation links if needed.
- [ ] Build the docs site and inspect its output for the required pages and absence of excluded internal content.
- [ ] Copy the build to `THEPC`, start the LAN server, and request the site from the host and development machine where routing permits.
- [ ] Commit the site as one `feat:` change, keep study/plan documents in `docs:` commits, and report the LAN address and hosting steps.

## Implementation Notes

The docs site uses `docs/` as its VitePress root and explicitly excludes `NEXT-SESSION.md`, prompt material, and other internal planning notes. The Windows preview must serve only `docs/.vitepress/dist`; it must not run the full app or expose environment files. The Docker image should also contain only the built static site and Nginx configuration.

## Verification and Rendezvous

Run `bun run docs:build`. Inspect generated routes and assets and verify excluded files are absent. Start the preview server on `THEPC` and check its HTTP response locally; test from the development machine if its network path to `192.168.1.39` allows it. Keep any firewall rule scoped to the private LAN and the docs port. After implementation and review, merge the completed branch into local `main` as specified by the repository workflow, preserving the feature branch and its commits.
