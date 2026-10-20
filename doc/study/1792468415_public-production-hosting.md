# Study: Public production hosting for Just Because

## Prompt and scope

The request is to serve Just Because publicly, with THEPC considered as the server instead of a Tailscale-only preview. This study evaluates whether the current PC is a safe production host and what remains to make the application usable. No public exposure, DNS changes, router changes, or production database changes are made in this study.

## Current evidence

The app is containerized on the Mac and responds successfully on the LAN and from THEPC over Tailscale. THEPC currently runs Windows 10 Pro and serves the static documentation preview on port 8088. The app homepage preview is on the Mac; THEPC does not have the app container configured. The repo has a Docker deployment guide, but the app's database URLs have not been configured locally, so account and gift flows remain unverified.

Microsoft ended Windows 10 Home/Pro support on October 14, 2025. Docker Desktop's Windows requirements also state that Windows 10 installations must be within Microsoft's servicing timeline. A public-facing host on this unmaintained OS would carry avoidable security risk. Tailscale Funnel can provide public HTTPS without router port forwarding, but it does not patch or isolate the host; Tailscale documents it as beta and with bandwidth limits.

## Feasibility and tradeoffs

THEPC could technically serve traffic through router forwarding or a public tunnel, but doing so now is not a sound production setup. Router forwarding adds direct inbound exposure. A tunnel avoids opening router ports and hides the home IP, but the host remains responsible for application execution, updates, secrets, and uptime. Home power/network reliability also becomes part of the production service.

A supported Linux VPS or EC2 instance is the recommended production target. The existing Node/Nitro Docker image and Compose deployment can run there behind HTTPS, while PostgreSQL remains managed. This separates the public service from the personal PC and provides a supported server OS. Keep THEPC for administration and private previews.

## Open decision

Choose the production target before implementation: a Linux VPS (simplest operations), EC2, or an upgraded/reinstalled THEPC on a supported OS. If THEPC must be the public server, upgrade it to a supported OS before exposing the app. In all cases, add the managed database URLs to the deployment environment and configure the public auth, payment-webhook, and OAuth origins.

## Sources

- Microsoft: [Windows 10 release information](https://learn.microsoft.com/en-us/windows/release-health/release-information)
- Docker: [Install Docker Desktop on Windows](https://docs.docker.com/desktop/setup/install/windows-install/)
- Tailscale: [Funnel](https://tailscale.com/docs/features/tailscale-funnel)
