# Site architecture

## Home-network preview

```text
Developer machine                 THEPC (Windows)                Other devices
pnpm docs:build  -- copy dist --> PowerShell static server  --> http://<PC-LAN-IP>:8088
```

The build is generated on the development machine. `THEPC` serves only the files in the build directory; it does not need Node or Docker. Find the current private IPv4 address with `ipconfig`; it may change if the router assigns a new lease.

## VPS or EC2

```text
Browser --> DNS --> Caddy (HTTPS :443) --> Nginx docs container (:8080)
                                            static VitePress output
```

The Docker build stage uses Node and pnpm to generate the site. The final image contains Nginx and static assets only. Caddy handles certificates and forwards HTTPS requests to Nginx. No database, application API, upload token, or payment secret belongs in this stack.

## What is separate

The Just Because gift application remains a separate service currently deployed on Vercel. This documentation portal does not replace that application or migrate its data. Hosting the full application on a VPS or EC2 would need a separate review of its database, authentication, email, upload storage, payments, migrations, and operational requirements.
