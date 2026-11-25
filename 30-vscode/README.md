**English** | [Español](README.es.md)

# 30-vscode

The VS Code user settings, its key bindings and the list of extensions that a new
PC installs.

| Path | Linked to | What it is |
|---|---|---|
| `vscode/settings.json` | `%APPDATA%\Code\User\settings.json` | User settings (JSONC, with comments) |
| `vscode/keybindings.json` | `%APPDATA%\Code\User\keybindings.json` | Key bindings |
| `vscode/extensions.txt` | — (read by `bootstrap.ps1`) | One extension id per line; step 8 of `bootstrap.ps1` installs the missing ones |

`install.ps1` creates the links. `extensions.txt` is regenerated from the
installed extensions, never edited by hand. Run it in the repo root from
PowerShell 7 or Git Bash, never from Windows PowerShell: that one writes UTF-16
with CRLF, and the repo is UTF-8 with LF.

```bash
code --list-extensions > 30-vscode/vscode/extensions.txt
```

Some extensions write connections and API keys into `settings.json`, which is
versioned in a public repo. Review it before every commit (see
[CONTRIBUTING.md](../CONTRIBUTING.md)).

## Reload

`Developer: Reload Window` from the command palette.
