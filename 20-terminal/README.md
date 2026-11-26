# 20-terminal

The Windows Terminal settings: PowerShell 7 as the default profile, the Monokai
Soda color scheme and CaskaydiaCove Nerd Font, which the prompt icons need.

| Path | Linked to | What it is |
|---|---|---|
| `windows-terminal/settings.json` | `%LOCALAPPDATA%\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json` | Profiles, color scheme, font and key bindings |

`install.ps1` creates the link. `bootstrap.ps1` installs the font, verified by
SHA-256.

Windows Terminal rewrites the whole file (4 spaces) each time a setting changes
from its interface, so `.prettierignore` leaves it out: formatting it would turn
every change into a huge diff.

## Reload

Close and open Windows Terminal.
