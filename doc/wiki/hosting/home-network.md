# Home-network preview

This runs the built documentation site from `THEPC` so other devices connected to the same home network can open it. Find the PC's current LAN address with `ipconfig`; do not use its Tailscale address for the home-network link.

## 1. Build the site

On the development machine, from the repository root:

```sh
pnpm -C doc/wiki install
pnpm -C doc/wiki docs:build
```

The finished site is in `doc/wiki/.vitepress/dist/`.

## 2. Copy the site to THEPC

Create a folder for the site and copy the build and PowerShell server script over SSH. These relative SCP paths use the remote SSH account's home directory:

```sh
ssh thepc 'powershell -NoProfile -Command "New-Item -ItemType Directory -Force -Path (Join-Path (Join-Path $env:USERPROFILE JustBecauseDocs) site-build) | Out-Null"'
scp -r doc/wiki/.vitepress/dist/* thepc:JustBecauseDocs/site-build/
scp doc/wiki/scripts/serve-static.ps1 thepc:JustBecauseDocs/serve-static.ps1
```

The server expects the generated pages in the `JustBecauseDocs\site-build` folder under the SSH account's home directory.

## 3. Start the LAN server

In a PowerShell window on `THEPC`, run the server in the foreground:

```powershell
$siteHome = Join-Path $env:USERPROFILE 'JustBecauseDocs'
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
& (Join-Path $siteHome 'serve-static.ps1') `
  -SiteRoot (Join-Path $siteHome 'site-build') `
  -BindAddress 0.0.0.0 `
  -Port 8088
```

Leave that PowerShell window open while the preview is needed. On another device connected to the same home network, visit `http://<PC-LAN-IP>:8088` (replace the placeholder with the IPv4 address shown by `ipconfig`). Press `Ctrl+C` in the window to stop the server.

If Windows Firewall blocks access, add a rule from an elevated PowerShell prompt, scoped to local devices:

```powershell
New-NetFirewallRule -DisplayName "Just Because Docs LAN" -Direction Inbound `
  -Action Allow -Protocol TCP -LocalPort 8088 -RemoteAddress LocalSubnet -Profile Any
```

Do not add a router port-forward for this temporary preview.

## Refresh the preview

Run `pnpm -C doc/wiki docs:build` again, copy the new build using the same `scp -r doc/wiki/.vitepress/dist/* thepc:JustBecauseDocs/site-build/` command, then refresh the browser. The LAN server does not build or modify source files.
