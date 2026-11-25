**English** | [Español](README.es.md)

# 60-apps

The environment's applications, in two lists in the `winget export` format. This
repo is for the environment, not for personal apps.

## What is here

| File | What it is | Who installs it |
|---|---|---|
| `essential.json` | The environment: Git, PowerShell, Windows Terminal, VS Code, oh-my-posh, Gpg4win, Rust, Python, Docker, nvm-windows and CLI tools | `bootstrap.ps1`, in that order |
| `optional.json` | Other development tools, picked on each PC | You, when you want them |

`tools/check.ps1` fails if an app is in both lists.

To install all the optional ones at once (PowerShell 7, in the repo root):

```powershell
winget import 60-apps\optional.json --accept-package-agreements --accept-source-agreements
```

## What is NOT here (and why)

- **Personal apps** (music, games, VPN, messaging, office…): they do not belong in
  a public repo. They come back with the system image or by hand.
- **System runtimes** (VCRedist, UI.Xaml, WindowsAppRuntime…): they install
  themselves as dependencies.

## Keeping it up to date

The full machine snapshot, with the personal apps, goes to
`winget-full.local.json`, which is in `.gitignore` and never published:

```powershell
winget export -o 60-apps\winget-full.local.json
```

When you install or remove a development tool, copy or delete its
`PackageIdentifier` in `optional.json`, or in `essential.json` if `bootstrap.ps1`
must always install it.
