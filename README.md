# Just Because

Group gift websites, made by the people who love you. Live at https://justbecause.site.

See [CLAUDE.md](./CLAUDE.md) for how the project is put together, the commands, and the rules.

## Documentation site

The living documentation in `doc/wiki/` also builds into a standalone static site. From the repository root:

```bash
pnpm --dir doc/wiki install
pnpm --dir doc/wiki docs:dev
pnpm --dir doc/wiki docs:build
```

For a preview from the Windows PC on your home network, follow
[the LAN hosting guide](./doc/wiki/hosting/home-network.md). To publish it later, use the
[VPS and Docker](./doc/wiki/hosting/vps-docker.md) or [AWS EC2](./doc/wiki/hosting/aws-ec2.md) guide.
