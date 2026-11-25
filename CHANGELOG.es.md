[English](CHANGELOG.md) | **Español**

# Changelog

Cambios relevantes del proyecto. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones siguen
[versionado semántico](https://semver.org/lang/es/).

## [Sin publicar]

### Añadido

- `tools/check.ps1` falla ante un comentario de código en español (`tools/check-comments.mjs`,
  con tests) e imprime lo que exime: Markdown, literales de texto y términos citados entre «» o
  comillas invertidas.
- `block-forbidden-commands.mjs` deja a Claude crear la etiqueta firmada de una versión
  (`git tag -s`) y sigue bloqueando borrar, mover o crear sin firma una etiqueta. Sus reglas
  tienen tests, que corre `tools/check.ps1`.
- `install.ps1` también añade a un `~/.claude/settings.json` existente las reglas `deny`/`ask`
  de la plantilla que le faltan, y `-Check` las avisa; la plantilla niega leer `.gnupg`
  y los almacenes de secretos de Linux (`.password-store`, `.local/share/keyrings`).
- `50-claude/hooks/command-rules.mjs`: fuente única de las reglas universales de comandos,
  enlazada en `~/.claude/hooks/`. Los proyectos llevan una copia idéntica que se compara con esta.
- `new-repo` crea con el repo el ruleset `Protect main` (sin borrado ni push forzado), desde
  `skills/new-repo/rulesets/protect-main.json`, y `repo-conventions` lo exige.
- `50-claude/skills/new-repo`: skill global que crea un repo bien armado, o
  completa uno existente (descripción y topics en GitHub, licencia, README
  bilingüe con diagrama, CHANGELOG, `CLAUDE.md`, formato, CI y el catálogo del
  cerebro), y `50-claude/rules/repo-conventions.md`, una regla global corta que
  apunta a él y avisa de lo que le falta a un repo. Los enlaza `install.ps1`.
- `15-git/`: la configuración de git, enlazada por `install.ps1`. Cada remoto
  elige su cuenta de GitHub por su dueño; las organizaciones de clientes y del
  trabajo se quedan en `~/.gitconfig.local` de la máquina, nunca en este repo público,
  igual que la clave de firma, que es de cada máquina.
- `repo-conventions`: la versión de Node vive solo en `engines.node`, exacta si
  se despliega y mínimo si la instalan otros.

### Cambiado

- Los enlaces de la capa de Claude Code viven en `50-claude/links.json`, que leen
  `lib/links.ps1` y el `lib/links.sh` de dotfiles-parrot. `50-claude/tools/` se enlaza como
  `~/.claude/tools`, para que cualquier repo corra las herramientas compartidas.

- La fusión de `~/.claude/settings.json` pasa de `install.ps1` a
  `50-claude/tools/install-settings.mjs` (con `--check` y tests), para que el `install.sh` de
  dotfiles-parrot aplique la plantilla igual. El resultado es el mismo que antes.

- `block-forbidden-commands.mjs` pregunta antes de un `git pull --ff-only` en vez de
  denegarlo: un fast-forward no pierde trabajo, y un clon de solo lectura lo necesita. Un pull
  que hace rebase, merge o fuerza sigue denegado. `git -C <carpeta> add -A` también se deniega
  ahora: se colaba.

- El `CLAUDE.md` global vale en Windows y en Linux: habla de «la carpeta de trabajo» de
  `entorno.md` en vez de `D:`, pide decir con qué privilegios corre un comando y pasa las
  trampas de cada sistema (junctions, robocopy, borrados sin papelera) a `entorno.md`, cuya
  plantilla cubre ahora los dos sistemas. Su regla de idioma coincide con la guía de
  comentarios: comentarios, salida de los scripts, mensajes de los hooks y nombres de los
  tests en inglés.

- Los comentarios del código, la salida de los scripts, los mensajes de los hooks
  y los nombres de los tests se escriben en inglés, según la guía nueva
  `docs/contributing/comments.md`.
- Node sale de fnm en vez de nvm-windows: cada terminal cambia a la versión del
  repo al entrar en él, las versiones viven en `<disk>\Dev\fnm` y la de por
  defecto queda en el PATH para las apps que arrancan sin perfil de shell.

## [1.0.0] - 2026-11-24

Primera versión: el entorno completo de Windows 11, reproducible en una PC nueva
con un comando.

### Añadido

- **Instalación.**
    - `bootstrap.ps1`: instalación idempotente con modo `-DryRun`. Fija las
      variables de entorno en el disco de trabajo (`D:`, o `C:` en una PC de un
      solo disco), instala las apps esenciales, la fuente Nerd, Node con pnpm y
      Claude Code, WSL con Ubuntu 26.04, la identidad de git, los enlaces y las
      extensiones de VS Code.
    - `install.ps1`: los symlinks de configuración de `lib/links.ps1`, con un
      backup `.pre-dotfiles.bak` de cada archivo existente; `-Check` informa de
      su estado sin cambiar nada. Reemplaza los enlaces a rutas viejas del repo,
      crea `~/.claude/settings.json` desde la plantilla si falta y registra los
      hooks nuevos en uno existente.
    - `uninstall.ps1`: revierte los enlaces y restaura los backups (`-DryRun`).
    - `githooks/post-merge`: vuelve a correr `install.ps1` tras cada `git pull`,
      así que un enlace o hook nuevo llega a las otras PCs solo con el pull.
- **`10-shell/`**: perfiles de PowerShell 7 y Git Bash con el prompt `capr4n` de
  oh-my-posh, compartido con dotfiles-parrot. Terminal-Icons se carga en
  diferido, y `tools/set-prompt-name.ps1` cambia el nombre que se muestra
  (`POSH_NAME`).
- **`20-terminal/`**: Windows Terminal con PowerShell 7 por defecto, Monokai,
  CaskaydiaCove Nerd Font (Nerd Fonts v3.5.1, verificada por SHA-256) y copiar
  al seleccionar.
- **`30-vscode/`**: settings, atajos y 39 extensiones; formateo al guardar con
  Prettier, PowerShell, shfmt y SQLTools, leyendo `.editorconfig`.
- **`40-format/`**: estilo global de Prettier y EditorConfig para proyectos sin
  el suyo, idéntico al de dotfiles-parrot.
- **`50-claude/`**: capa global de Claude Code. Un `CLAUDE.md` universal con
  presupuesto de líneas, una línea de estado, hooks que obligan a editar con
  Edit/Write, bloquean el git de escritura y los comandos de riesgo y mantienen
  las respuestas en español, una plantilla de `settings.json`, la plantilla del
  `entorno.md` local y un panel de tareas que cualquier repo activa con
  `.claude/panel.json`.
- **`60-apps/`**: `essential.json`, que instala `bootstrap.ps1`, y
  `optional.json`, que se elige en cada PC, los dos en el formato de
  `winget export`.
- **Calidad.** `tools/check.ps1` corre las mismas comprobaciones que el CI:
  sintaxis de PowerShell y PSScriptAnalyzer, JSON, listas de apps sin solaparse,
  higiene del repo público, finales LF, documentación bilingüe, presupuesto de
  la capa de Claude Code, tests del panel y gitleaks. CI en GitHub Actions con
  las acciones fijadas por SHA de commit, y Dependabot para actualizarlas cada
  mes.
- **Documentación** en inglés y español, con selector de idioma: README como
  índice con un diagrama, guía de PC nueva (`docs/getting-started`), firma de
  commits, formato, `CONTRIBUTING` y el README de cada carpeta.

### Seguridad

- Historial purgado con `git-filter-repo`: una API key filtrada y datos de
  conexión de la empresa (servidor de Fabric, correo corporativo, IDs de Azure)
  que estaban públicos desde el commit inicial se eliminaron de **todos** los
  commits, autoría incluida. Se saneó `30-vscode/vscode/settings.json` y se
  añadió `*.local.json` a `.gitignore`.
- `tools/check.ps1` no guarda en el repo los literales sensibles que busca: los
  lee de `tools/hygiene-patterns.local` (ignorado por git) o de la variable
  `DOTFILES_HYGIENE_PATTERNS`.
- `block-forbidden-commands.mjs` no nombra ningún repo: los repos donde se
  permite el push a `main` salen de `~/.claude/hooks.local.json`, que no se
  versiona (forma en `50-claude/hooks.local.example.json`).

[Sin publicar]: https://github.com/M1gu3l4ngel/dotfiles-windows/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/M1gu3l4ngel/dotfiles-windows/releases/tag/v1.0.0
