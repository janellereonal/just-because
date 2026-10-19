# Updates and troubleshooting

## Update content

1. Edit the Markdown pages in `doc/wiki/`.
2. Build with `pnpm -C doc/wiki docs:build` and inspect locally with `pnpm -C doc/wiki docs:preview`.
3. For the home preview, copy the new `doc/wiki/.vitepress/dist/` to `THEPC` and refresh the browser.
4. For a VPS or EC2 host, pull the intended revision and run `docker compose up -d --build` from `doc/wiki/`.

## Common issues

| Symptom | Check |
| --- | --- |
| LAN page does not load | Confirm the PC and client are on the same network, the server window is still open, and the URL uses the PC's current LAN IPv4 address. |
| Connection times out | Check Windows Firewall for TCP `8088` from `LocalSubnet`; do not create a router port-forward for the preview. |
| Site is blank or assets fail | Copy the latest `doc/wiki/.vitepress/dist/` build and serve the directory containing `index.html`. |
| HTTPS certificate is not issued | Check DNS resolution and make sure inbound TCP `80` and `443` reach Caddy. Review `docker compose logs caddy`. |
| Changes are not visible | Confirm you copied/rebuilt the latest revision, then hard-refresh the browser. |

## Keep it static

This portal does not need application secrets. Do not copy the repository's root `.env` into the `doc/wiki/` folder or Docker context. The `.dockerignore` excludes development caches and local environment files from the image build.
