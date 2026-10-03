**English** | [Español](README.es.md)

# dotfiles-windows

Windows 11 development setup: PowerShell, oh-my-posh, Windows Terminal,
VS Code, WSL and the development toolchain, with one-command install.

[![CI](https://github.com/M1gu3l4ngel/dotfiles-windows/actions/workflows/ci.yml/badge.svg)](https://github.com/M1gu3l4ngel/dotfiles-windows/actions/workflows/ci.yml)

![Desktop](assets/preview.png)

## Reproduce in one command

On a new PC (it will prompt for UAC for WSL, Docker and some apps). From PowerShell:

```powershell
git clone https://github.com/M1gu3l4ngel/dotfiles-windows.git $env:USERPROFILE\dotfiles
cd $env:USERPROFILE\dotfiles
.\bootstrap.ps1
```

To preview what it would do without changing anything: `.\bootstrap.ps1 -DryRun`.

Afterwards, complete the manual steps (GPG/SSH keys) that the script itself lists.

## Prerequisites

- Windows 10/11 with `winget` (App Installer, from the Microsoft Store).
- **git** to clone the repo. If the PC doesn't have it (freshly formatted), install
  it first and reopen the terminal: `winget install Git.Git`. `bootstrap.ps1`
  installs and updates everything else idempotently (git included: if it's already
  there, it skips it).
- **Developer Mode** enabled (Settings → Privacy & security → For developers) or
  run PowerShell as administrator: required to create the symlinks.
- Recommended: run `bootstrap.ps1` as administrator (WSL and Docker require it).

## What bootstrap.ps1 does

It is idempotent: each step checks whether it is already done, so it can be re-run
without breaking anything (for example after a reboot).

| Step | What it installs or configures |
|---|---|
| 1 | Essential winget set: Git, PowerShell 7, Windows Terminal, VS Code, oh-my-posh, Gpg4win, Rust, Python, Docker, WSL and CLI tools (fzf, ripgrep, bat, fd, jq, lsd, Neovim, shfmt) |
| 2 | CaskaydiaCove Nerd Font (download verified by SHA-256) |
| 3 | Environment variables pointing to `D:` (or `C:` if there is no `D:`) |
| 4 | Node (nvm-windows) + pnpm + Claude Code in `<disk>\Dev\npm-global` |
| 5 | WSL Ubuntu (requires a reboot) |
| 6 | git: name, noreply email and defaults |
| 7 | Configuration symlinks (`install.ps1`) |
| 8 | Shows the manual steps that involve secrets (GPG/SSH) |

It only installs the **environment**. Personal apps are left untouched (see `apps/`).

## Install only the configurations

If you already have the stack installed and only want these configs:

```powershell
.\install.ps1
```

Before creating each link, `install.ps1` renames your existing file with the
`.pre-dotfiles.bak` suffix. To roll back, use `uninstall.ps1` (below).

## Uninstall

Reverts the symlinks and restores your original files (the `.pre-dotfiles.bak`
ones). With `-DryRun` it only shows what it would do, without touching anything;
without it, it reverts for real:

```powershell
.\uninstall.ps1 -DryRun
.\uninstall.ps1
```

It does not uninstall apps or touch environment variables or WSL.

## Manual steps (involve secrets, not automated)

1. SSH and GPG keys, and commit signing: [docs/gpg-signing.md](docs/gpg-signing.md).
2. Restore the VS Code extensions:

   ```powershell
   Get-Content .\vscode\extensions.txt | ForEach-Object { code --install-extension $_ }
   ```

## Structure

| Path | Contents |
|---|---|
| `bootstrap.ps1` | One-command environment install |
| `install.ps1` | Configuration symlinks |
| `uninstall.ps1` | Revert the symlinks and restore the backups (`-DryRun` to simulate) |
| `lib/` | Shared code (the symlink mapping) |
| `powershell/` | PowerShell profile (PS 7 and legacy, same file) |
| `bash/` | Git Bash profile (same prompt as PowerShell) |
| `oh-my-posh/` | Prompt theme (`capr4n`, shared with Parrot) |
| `windows-terminal/` | Windows Terminal settings |
| `vscode/` | Settings, keybindings and the extension list |
| `format/` | Global Prettier and EditorConfig style for projects without their own ([docs/formatting.md](docs/formatting.md)) |
| `apps/` | Reference snapshot of applications |
| `docs/` | Detailed guides |
| `.claude/rules/` | Project conventions (loaded by Claude Code) |

## Reproducibility across machines

The repo detects the work disk (`D:` or `C:`) and does not depend on fixed user
paths, so cloning it and running `bootstrap.ps1` leaves another PC with the same
environment. Personal apps and secrets are restored separately (system image and
new keys).

## Application snapshot

`apps/winget-dev.json` lists the environment/development apps, reinstallable with
`winget import`. Personal apps are not versioned: they are restored with the system
image. Details in [apps/README.md](apps/README.md).

## Visual prompt name (optional)

By default the prompt shows your Windows username. If you prefer to show a different
name (on screen only, without touching the system), use the helper:

```powershell
.\tools\set-prompt-name.ps1
```

It asks for the name (blank Enter = your real username) and saves it in the
`POSH_NAME` variable, which the theme reads. It is purely decorative: it does not
affect paths, commands or git.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `install.ps1` fails to create symlinks | Developer Mode off | Enable it, or run as administrator |
| The prompt does not appear in a new terminal | The profile did not load | `. $PROFILE`, or reopen the terminal |
| Icons show as squares | Missing CaskaydiaCove Nerd Font | Re-run `bootstrap.ps1` |
| `nvm` not recognized after bootstrap | PATH not refreshed | Reopen PowerShell and run `bootstrap.ps1` again |
| GitHub shows "Unverified" | The GPG key UID does not have the noreply email | [docs/gpg-signing.md](docs/gpg-signing.md) |

## Documentation and contributing

Guides in [docs/](docs/README.md). Conventions in `.claude/rules/`. To contribute
or modify the repo: [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits and license

The oh-my-posh prompt and the color palette are shared with
[dotfiles-parrot](https://github.com/M1gu3l4ngel/dotfiles-parrot).

Licensed [MIT](LICENSE).
