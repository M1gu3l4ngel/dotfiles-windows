[English](CHANGELOG.md) | **Español**

# Changelog

Cambios relevantes del proyecto. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones siguen
[versionado semántico](https://semver.org/lang/es/).

## [Sin publicar]

### Añadido

- `install.ps1` crea `~/.claude/settings.json` desde la plantilla cuando la
  máquina no tiene uno, con la ruta real del home, así que los hooks corren en
  una PC nueva sin editar nada. Si el archivo existe no se toca y el instalador
  avisa de los hooks que faltan por registrar.
- Estilo global de formato: los `.jsonc` se formatean sin coma final.
- Hook global `claude/hooks/block-forbidden-commands.mjs`: bloquea el git de
  escritura, `prettier --write` con un glob y `robocopy /MIR` sin `/XJ`, y
  pregunta antes de un borrado recursivo fuera de un temporal. Lo enlaza
  `install.ps1` y se registra en `settings.template.json`.
- `CLAUDE.md` global: reglas de higiene de contexto, delegación y hallazgos
  (presupuesto subido a 60 líneas); `settings.template.json` limita la salida
  de Bash y de MCP.
- `.github/dependabot.yml`: un pull request mensual con las subidas de las
  acciones del CI, que van fijadas por SHA de commit.
- Artefacto de tareas: `claude/tasks-artifact.template.html` (diseño fijo) y la
  regla de `CLAUDE.md` que lo pide en los trabajos de varios bloques.
- README: sección "Mantener otra PC al día" (`git pull`, y cuándo volver a
  correr `install.ps1` o `bootstrap.ps1`).
- Documentación completa en inglés y español: cada documento `X.md` (inglés, el
  que muestra GitHub) tiene su pareja `X.es.md`, con selector de idioma. Incluye
  el README, `CONTRIBUTING`, este changelog, `docs/` y los README de `apps/` y
  `claude/`. `tools/check.ps1` (`tools/check-docs.ps1`) falla si falta una
  pareja o si difieren en estructura, enlaces o bloques de código, y si hay
  enlaces o anclas rotos.
- Estilo global de formato (`format/`, copia del de dotfiles-parrot):
  `.prettierrc.json` y `.editorconfig` enlazados en el perfil y en
  `<disk>\Dev`, para los proyectos sin configuración propia (tabuladores,
  comillas dobles, 100 columnas). Un proyecto con la suya nunca usa la global.
  El repo tiene su propio `.prettierrc.json` y `.prettierignore`.
- VS Code formatea el shell con shfmt (lo instala `bootstrap.ps1`) y el SQL con
  SQLTools, lee el `.editorconfig` (extensión EditorConfig) y guarda al cambiar
  el foco para que el formateo al guardar se ejecute siempre.
- Capa global de Claude Code (`claude/`): `CLAUDE.md` universal, barra de
  estado, hook que impone editar con Edit/Write, plantilla de `settings.json`
  (secretos en `deny`/`ask`) y `check-budget.mjs`, enlazados por `install.ps1`.
- `uninstall.ps1` + `lib/links.ps1`: desinstalador que revierte los symlinks y
  restaura los backups (con `-DryRun`); el mapeo de symlinks se comparte entre
  `install.ps1` y `uninstall.ps1` para que no se desincronicen.
- `tools/check.ps1` + `PSScriptAnalyzerSettings.psd1`: comprobaciones locales de
  calidad (sintaxis, PSScriptAnalyzer, JSON, higiene del repo público, LF).
- CI en GitHub Actions (windows-latest): corre `tools/check.ps1` en cada push y
  pull request, con las acciones fijadas por SHA de commit y permisos mínimos.
- `bootstrap.ps1`: instalación del entorno en un comando, idempotente, con modo
  `-DryRun`. Instala el set esencial de winget, fuentes Nerd verificadas por
  SHA-256, toolchain de Node, variables de entorno, WSL y los symlinks.
- `.gitattributes` (finales de línea LF en todo el repo) y `.editorconfig`.
- `apps/`: snapshot de referencia de aplicaciones: `winget-dev.json` (público,
  solo entorno/dev) y `winget-full.local.json` (completo, gitignored).
- `.claude/rules/`: reglas modulares (security, git, file-edits, powershell,
  documentation, environment), que Claude Code carga solas.
- `CONTRIBUTING.md` y `CHANGELOG.md`.
- `bash/`: perfil de Git Bash con el mismo prompt (oh-my-posh).

### Cambiado

- `bootstrap.ps1` instala pnpm como `@pnpm/exe` (ejecutable propio, que no
  depende de la versión de Node activa) en vez del paquete `pnpm`.
- Perfil de PowerShell ~48% más rápido: Terminal-Icons se carga diferido (OnIdle).
- Prompt (oh-my-posh): texto oscuro uniforme, consistente en VS Code, Windows
  Terminal y Parrot.
- Tema del prompt sincronizado con dotfiles-parrot: el título de la pestaña usa
  `POSH_NAME` como el prompt y muestra `~` en la carpeta de inicio en vez de su
  nombre (las capturas ya no enseñan el usuario real) y el
  icono de cambios de git es el escape `` en vez de un glifo literal. El
  README explica cómo cambiar el nombre en una sola terminal (`$env:POSH_NAME`),
  como en Parrot.
- Scripts `.ps1` en ASCII puro (sin BOM) para compatibilidad con PowerShell 5.1.
- `install.ps1`: backup con fecha si ya existe uno, validación de capacidad de
  symlink antes de tocar nada, y comparación de rutas robusta.
- `bash/.bashrc`: la ubicación del repo se deriva del symlink (funciona aunque no
  se clone en `~/dotfiles`).
- Fuente actualizada a **CaskaydiaCove Nerd Font** (Nerd Fonts v3.5.1); antes se
  documentaba Hack.
- Documentación reescrita en estilo sobrio, sin emojis.
- `CLAUDE.md` dividido en reglas modulares bajo `.claude/rules/`.

### Seguridad

- `tools/check.ps1` ya no escribe en el repo los literales sensibles que busca:
  los lee de `tools/hygiene-patterns.local` (ignorado por git) o de la variable
  `DOTFILES_HYGIENE_PATTERNS`. Se purgaron del historial, también de la autoría
  de los commits.
- Purga del historial con `git-filter-repo`: se eliminaron de **todos** los
  commits una API key filtrada y datos de conexión de la empresa (servidor de
  Fabric, correo corporativo, IDs de Azure) que estaban públicos desde el commit
  inicial.
- `vscode/settings.json` saneado; `*.local.json` añadido a `.gitignore`.
