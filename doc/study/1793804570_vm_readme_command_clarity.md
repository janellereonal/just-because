# Study: Clarify THEPC VM README commands

## Request

Clarify the existing deployment README steps for copying Compose files from the admin Mac to THEPC, creating the VM deployment directory, and preparing the private `.env`. Append the confusing cases and errors already encountered, then resume implementation.

## Current state

- Current branch is `codex/just-because-work`, tracking `origin/codex/just-because-work` with a clean worktree.
- `deployment/app/README.md` contains the VM migration runbook and a copy sequence using `ssh`, `scp`, `sudo install -d`, `cp`, `chmod`, and `nano`.
- User reported that sudo authentication failed on THEPC. Therefore, a README command that uses `sudo` to create `/opt/just-because/deployment/app` is not currently a reliable next step.
- User has Docker installed or is proceeding with Docker; the current question is about clarifying command order and meaning before continuing deployment.

## Findings and risks

- Copying the Compose files and `.env.example` is an admin-workstation action, run from the repository root; creating `.env` and entering provider settings is a separate VM action performed after copy.
- The README's `sudo install -d -o "$USER" -g "$USER" ...` needs working administrative privileges. Replacing it with `mkdir -p /opt/...` is safe only if the VM user can write to the parent path; otherwise it fails with `Permission denied`.
- The runbook should state a deterministic alternative when sudo is unavailable: use a user-owned deployment directory such as `$HOME/just-because/deployment/app`, and run Compose from there. Do not direct the user to repeatedly retry sudo or weaken permissions.
- Commands should be grouped by which machine they run on, with clear expected outcomes and short troubleshooting notes for Tailscale name resolution, scp path, existing `.env`, and filesystem permissions.
- The temporary transfer folder `/tmp/just-because-app` contains only non-secret deployment files. Secrets must be entered only into the VM `.env`, which must remain mode `600` and not be copied back.

## Proposed README-only change

Revise the copy subsection to clearly separate:

1. Admin Mac: verify repository root and Tailscale connection, set `VM_USER`/`VM_HOST`, create transfer folder, copy files.
2. THEPC VM: install files into `/opt/...` only if privileged directory creation succeeds; otherwise use a home-directory deployment path and explain that subsequent commands must use that path.
3. VM `.env`: create it once, edit credentials locally, save, and use only the safe presence check afterward.
4. Troubleshooting: explain `command not found`, `Could not resolve hostname`, `Permission denied`, `No such file or directory`, and `cp -n` reporting/skipping an existing `.env`.

Do not alter Compose configuration, credentials, cloud resources, app behavior, or other documentation in this focused task.

## Existing plan alignment

This change clarifies the already approved THEPC rollout runbook in `doc/plan/1793703335_thepc_vm_production_rollout.md`; it does not introduce a new hosting strategy or change the rollout gates.
