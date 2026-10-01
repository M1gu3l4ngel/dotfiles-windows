# Changelog

Cambios relevantes del proyecto. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones siguen
[versionado semántico](https://semver.org/lang/es/).

## [Sin publicar]

### Añadido

- `bootstrap.ps1`: instalación del entorno en un comando, idempotente, con modo
  `-DryRun`. Instala el set esencial de winget, fuentes Nerd verificadas por
  SHA-256, toolchain de Node, variables de entorno, WSL y los symlinks.
- `.gitattributes` (finales de línea LF en todo el repo) y `.editorconfig`.
- `apps/`: snapshot de referencia de aplicaciones — `winget-dev.json` (público,
  solo entorno/dev) y `winget-full.local.json` (completo, gitignored).
- `.claude/rules/`: reglas modulares (security, git, file-edits, powershell,
  documentation, environment), que Claude Code carga solas.
- `CONTRIBUTING.md` y `CHANGELOG.md`.
- `bash/`: perfil de Git Bash con el mismo prompt (oh-my-posh).

### Cambiado

- `install.ps1`: backup con fecha si ya existe uno, validación de capacidad de
  symlink antes de tocar nada, y comparación de rutas robusta.
- `bash/.bashrc`: la ubicación del repo se deriva del symlink (funciona aunque no
  se clone en `~/dotfiles`).
- Fuente actualizada a **CaskaydiaCove Nerd Font** (Nerd Fonts v3.5.1); antes se
  documentaba Hack.
- Documentación reescrita en estilo sobrio, sin emojis.
- `CLAUDE.md` dividido en reglas modulares bajo `.claude/rules/`.

### Seguridad

- Purga del historial con `git-filter-repo`: se eliminaron de **todos** los
  commits una API key filtrada y datos de conexión de Stout (servidor de Fabric,
  correo corporativo, IDs de Azure) que estaban públicos desde el commit inicial.
- `vscode/settings.json` saneado; `*.local.json` añadido a `.gitignore`.
