# Convenciones del proyecto

Este repo es mi setup personal de Windows 11 (PowerShell + oh-my-posh + Windows Terminal + VS Code), paralelo a mi repo de dotfiles para Parrot Security ([dotfiles-parrot](https://github.com/M1gu3l4ngel/dotfiles-parrot)).

## Git

- NO ejecutar comandos git (commit, add, push, pull) sin permiso explícito del usuario; solo sugerir commit names
- Formato: `type(scope): descripción en español` — una sola línea, type en inglés (feat, fix, docs, style, refactor, chore), descripción en ESPAÑOL. Ejemplo: `docs(readme): mejorar guía de instalación`

## Estilo

- Comentarios en español
- Indentación: 4 espacios en markdown, 4 espacios en PowerShell
- Máximo 1 línea en blanco consecutiva
- Headers explicativos al inicio de cada archivo de config

## Archivos protegidos (NO MODIFICAR sin permiso)

- LICENSE
- README.md
- cualquier cosa en .git/
- `vscode/extensions.txt` (se regenera con `code --list-extensions > vscode\extensions.txt`)

## Archivos que NO se versionan (en .gitignore)

- `mcp.json` (contiene tokens de MCP servers como SONARQUBE_TOKEN)
- `syncLocalSettings.json` (state local de Settings Sync de VS Code)
- Backups `.pre-dotfiles.bak`
- Llaves SSH, `.env`, secretos

## Symlinks

- `install.ps1` crea symlinks con `New-Item -ItemType SymbolicLink`
- Requiere **Developer Mode** activado en Windows 10/11 (sin admin)
- Backup automático con sufijo `.pre-dotfiles.bak` antes de cualquier sobreescritura
- Idempotente: si se corre dos veces no rompe nada

## Comandos para gestión de paquetes

- **Apps**: solo `winget` (no usar choco, scoop, ni instaladores manuales)
- **Módulos PowerShell**: `Install-Module -Scope CurrentUser` (sin admin)
- **Extensiones VS Code**: `code --install-extension`

## Reload de configs

- PowerShell profile: `. $PROFILE` (sin reabrir la terminal)
- Windows Terminal: cerrar y abrir
- VS Code: `Developer: Reload Window` desde la paleta de comandos

## Datos sensibles en este repo

El `.gitconfig` NO se versiona porque acumula entradas `safe.directory` por máquina y revela proyectos personales/de trabajo. Se configura una vez con `git config --global` (ver README.md sección Paso 3).
