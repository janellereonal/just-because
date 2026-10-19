# Hosting overview

This portal is a static site built from Markdown. The build produces HTML, CSS, JavaScript, and images in `.vitepress/dist`. It has no database, login system, or runtime secrets.

## Pick a path

| Where | Best for | How it runs |
| --- | --- | --- |
| Home network | Previewing the docs with your devices | PowerShell serves the built files from `THEPC` on port `8088` |
| Linux VPS | A small always-on public site | Docker Compose runs Nginx and Caddy |
| AWS EC2 | Hosting inside an AWS account | The same Docker Compose stack, with an EC2 security group |

## Recommended sequence

1. Build and preview locally with `pnpm -C doc/wiki docs:dev`.
2. Copy the production build to `THEPC` and open it on your home network.
3. When you choose a public host, configure a domain and use the [VPS with Docker](/hosting/vps-docker) or [AWS EC2](/hosting/aws-ec2) guide.

The documentation container serves only the generated site. It does not include the Just Because app, its database, or its environment variables.

## Requirements

- Local authoring/build: Node.js 22 or newer and pnpm.
- LAN preview host: Windows PowerShell 5.1 or newer. No Node, Python, or Docker is required on `THEPC`.
- VPS or EC2 host: a supported Linux distribution, Docker Engine with the Compose plugin, and a domain name for automatic HTTPS.

See [site architecture](/hosting/architecture) for the request path and [updates and troubleshooting](/hosting/operations) for day-to-day operation.
