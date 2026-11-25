[English](README.md) | **Español**

# 30-vscode

Los ajustes de usuario de VS Code, sus atajos y la lista de extensiones que instala
una PC nueva.

| Ruta | Enlazado en | Qué es |
|---|---|---|
| `vscode/settings.json` | `%APPDATA%\Code\User\settings.json` | Ajustes de usuario (JSONC, con comentarios) |
| `vscode/keybindings.json` | `%APPDATA%\Code\User\keybindings.json` | Atajos de teclado |
| `vscode/extensions.txt` | — (lo lee `bootstrap.ps1`) | Un id de extensión por línea; el paso 8 de `bootstrap.ps1` instala las que faltan |

`install.ps1` crea los enlaces. `extensions.txt` se regenera desde las extensiones
instaladas, nunca se edita a mano. Se corre en la raíz del repo desde PowerShell 7
o Git Bash, nunca desde Windows PowerShell: ese escribe UTF-16 con CRLF, y el repo
es UTF-8 con LF.

```bash
code --list-extensions > 30-vscode/vscode/extensions.txt
```

Algunas extensiones escriben conexiones y API keys en `settings.json`, que se
versiona en un repo público. Revísalo antes de cada commit (ver
[CONTRIBUTING.es.md](../CONTRIBUTING.es.md)).

## Recargar

`Developer: Reload Window` desde la paleta de comandos.
