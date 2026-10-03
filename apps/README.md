**English** | [Español](README.es.md)

# apps — application snapshot (reference)

This folder records **which applications are installed**, as a reference. **They
are not auto-installed**: this repo is for the *environment*, not for personal apps.

## What is here

- **`winget-dev.json`**: **public** snapshot with only the **environment and
  development** apps. It is safe to publish. To reinstall them selectively on a
  new machine:

  ```powershell
  winget import apps\winget-dev.json --accept-package-agreements --accept-source-agreements
  ```

- **`winget-full.local.json`**: **complete** snapshot of the machine (personal
  apps included). It is **gitignored** (`*.local.json`): it is your private
  record and **is not published**. To regenerate it:

  ```powershell
  winget export -o apps\winget-full.local.json
  ```

## What is NOT here (and why)

- **The essential set is already installed by `bootstrap.ps1`** (Git, PowerShell,
  Windows Terminal, VS Code, oh-my-posh, GnuPG, Rust, Python, Docker, WSL and CLI
  tools). `winget-dev.json` records the other dev tools; the bootstrap and this
  snapshot complement each other, they do not overlap.
- **Personal apps** (Spotify, Steam, games, VPN, Telegram, Teams, Office…): they
  do not belong in a public repo. They are restored with the **system image**
  (layer 4 of the backup strategy) or by hand.
- **System runtimes** (VCRedist, UI.Xaml, WindowsAppRuntime…): they install
  themselves as dependencies; there is no point in listing them.

## Keeping it up to date

When you install or remove development apps, regenerate the complete snapshot and
curate the public one again (adding/removing IDs in `winget-dev.json`):

```powershell
winget export -o apps\winget-full.local.json
```
