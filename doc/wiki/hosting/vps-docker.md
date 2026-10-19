# VPS with Docker

This is the straightforward public-hosting path for a small documentation site. A VPS provider supplies a Linux machine; Docker Compose runs the static site and Caddy. Caddy obtains and renews HTTPS certificates after the domain points to the server and ports 80 and 443 are reachable.

## Prepare the host

1. Create a Linux VPS with a supported Ubuntu or Debian release and a stable public IP.
2. Point a DNS `A` record for your docs hostname to that address. Add an `AAAA` record only if IPv6 is configured and reachable.
3. In the provider firewall, allow inbound TCP `80` and `443` from visitors. Limit SSH (`22`) to your own public IP or use the provider's private console. Do not expose SSH to everyone.
4. Install Docker Engine and the Compose plugin using the [official Docker Engine instructions](https://docs.docker.com/engine/install/) for your distribution. Avoid convenience scripts for a long-lived server.

## Start the site

Copy or clone this repository onto the VPS. From the `doc/wiki/` directory:

```sh
cp .env.example .env
```

Edit `.env` and set `DOCS_DOMAIN` to the hostname whose DNS points to this server. Then build and start the stack:

```sh
docker compose up -d --build
docker compose ps
docker compose logs -f caddy
```

Open `https://your-docs-hostname/`. Caddy can issue a certificate only after DNS is correct and its HTTP/HTTPS ports are reachable. Keep those ports open in both the provider firewall and the host firewall.

## Update or stop

To deploy a newer branch revision:

```sh
git pull --ff-only
docker compose up -d --build
```

To stop the services while retaining Caddy's certificate data:

```sh
docker compose down
```

Back up Docker's `caddy_data` volume if you want to preserve its certificate state. The site content can be rebuilt from Git. Docker port publishing can interact with Linux firewall rules; review [Docker's firewall guidance](https://docs.docker.com/engine/install/ubuntu/#firewall-limitations) before adding a host firewall policy.

## Security boundary

The site is public once DNS and ports are configured. The container serves static documentation only and should never receive the main app's `.env` file, database URL, payment keys, or blob credentials. Keep SSH key material outside the repository and restrict SSH access at the provider firewall.
