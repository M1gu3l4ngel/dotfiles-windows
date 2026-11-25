# Tareas pendientes — dotfiles-windows

Solo lo que falta: lo hecho se borra. Formato y reglas en
`.claude/rules/task-tracking.md`; el panel de tareas es una vista de este archivo.

# Por probar

## Prompt tras los arreglos del perfil

**Plataforma:** Shell.

- [ ] [Esta PC] Una terminal nueva de PowerShell 7 abre con el prompt de siempre
- [ ] [Esta PC] Una terminal nueva de Windows PowerShell abre con el prompt de siempre
- [ ] [Esta PC] Una terminal nueva de Git Bash abre con el prompt de siempre

## Edición y push con los hooks nuevos

**Plataforma:** Claude Code.

- [ ] [Esta PC] Claude edita un archivo del repo sin pedir aprobación
- [ ] [Esta PC] `git push` a `main` en el repo de solo `main` pregunta en vez de denegar
- [ ] [Esta PC] `git push` a `main` en cualquier otro repo se deniega

## Shells tras pasar a 10-shell

**Plataforma:** Shell.

- [ ] [Esta PC] Tras un `git pull` en otra PC, el `post-merge` rehace los enlaces y el prompt sigue igual
- [ ] [Esta PC] Windows Terminal abre con PowerShell 7, Monokai Soda y la fuente de siempre

## Instalación en una PC nueva

**Plataforma:** Instalación.

- [ ] [PC nueva] `docs/getting-started` funciona de principio a fin en un Windows 11 limpio, sin pasos que falten
- [ ] [PC nueva] `bootstrap.ps1` instala las 18 apps de `60-apps/essential.json`
- [ ] [PC nueva] `bootstrap.ps1` instala las 39 extensiones de VS Code y los `.ps1` se formatean al guardar

## Documentación en GitHub

**Plataforma:** Repositorio.

- [ ] Los diagramas del README y de `docs/getting-started` se dibujan en tema claro y oscuro

## Repos nuevos con new-repo

**Plataforma:** Claude Code.

- [ ] Al pedir un repo nuevo, Claude usa `new-repo`: pregunta dueño y visibilidad juntos y confirma antes de `gh repo create`
- [ ] El repo nace con descripción, topics, licencia, README y CHANGELOG en pareja, `CLAUDE.md`, formato y CI
- [ ] En un repo de una organización con cerebro, lo registra en su catálogo
- [ ] En un repo existente al que le falta algo, Claude lo avisa como hallazgo

## Secretos de Linux en la plantilla de settings

**Plataforma:** Claude Code.

- [ ] [Esta PC] `.\install.ps1 -Check` dice `ok template deny/ask rules`
- [ ] En Parrot, tras enlazar la capa, Claude no puede leer `~/.password-store` ni `~/.local/share/keyrings`

## CLAUDE.md global en Windows y Linux

**Plataforma:** Claude Code.

- [ ] En una sesión nueva, Claude pone el trabajo en la carpeta de trabajo de `entorno.md` y dice con qué privilegios corre cada comando que te pide
- [ ] En Parrot, `~/.claude/entorno.md` se rellena con la plantilla nueva sin secciones que solo valgan en Windows

## Pull con fast-forward en el hook

**Plataforma:** Claude Code.

- [ ] En Parrot, `git -C ~/dotfiles-windows pull --ff-only` pide aprobación en vez de bloquearse
- [ ] `git pull` sin `--ff-only` sigue bloqueado

## Herramientas compartidas de la capa de Claude

**Plataforma:** Claude Code.

- [ ] [Esta PC] `.\install.ps1 -Check` sale con 23 enlaces en `ok`, `~/.claude/tools` incluido
- [ ] [Esta PC] Tras un `git pull`, el post-merge corre `install.ps1` y la parte de `settings.json` dice `skip`
- [ ] [PC nueva] `.\bootstrap.ps1` crea `~/.claude/settings.json` con la plantilla (ahora lo hace `install-settings.mjs`)
- [ ] Tras el push, el CI pasa con `Shared tools` y `Bilingual docs` en verde
- [ ] En Parrot, `install.sh` enlaza la capa desde `links.json` y llama a `install-settings.mjs`

## Código en inglés

**Plataforma:** Repositorio.

- [ ] [Esta PC] `.\install.ps1 -Check` sale en inglés y con todo en `ok`
- [ ] [Esta PC] `.\tools\check.ps1` muestra el check de comentarios con sus tres exenciones
- [ ] Tras el push, el CI de GitHub pasa con el job `Checks`
- [ ] En una sesión nueva en este repo, Claude escribe en inglés los comentarios nuevos

## Panel de tareas

**Plataforma:** Claude Code.

- [ ] [Esta PC] El panel abre con las tareas de este archivo y el backlog
- [ ] [Esta PC] El selector Claro/Oscuro cambia el tema y se recuerda al recargar
- [ ] [Esta PC] «Por probar» muestra una tarjeta por plataforma y el filtro de dispositivo
- [ ] [Esta PC] Buscar abre los bloques con resultados y resalta el texto
- [ ] [Esta PC] Al abrir una sesión nueva en este repo, Claude dice si el panel está al día

---

# Lo hace el dueño

- [ ] Copiar `50-claude/hooks/command-rules.mjs` (commit `3f13e95`, sha256 `b972400a…`) al proyecto que guarda su copia idéntica, para que su check `hook-rules-copy` vuelva a pasar

# Aplazado — cada uno con el evento que lo dispara

- [ ] Leer el nombre y el correo de git de parámetros de `bootstrap.ps1` (`Invoke-Step6Git`), con los del dueño por defecto: hoy quien haga un fork firma con una identidad ajena si no lo cambia antes, y `docs/getting-started` solo lo avisa — antes de anunciar el repo o cuando alguien haga un fork
- [ ] Script idempotente de ajustes de Windows, con `-DryRun`: el modo de desarrollador y los ajustes del registro se hacen a mano en una PC nueva — en la próxima PC nueva
- [ ] Enlazar en WSL un `.bashrc` que cargue oh-my-posh con el tema del repo: Ubuntu 26.04 trae el de serie (`.claude/rules/environment.md`) — cuando se trabaje en WSL a diario
- [ ] `enabledPlugins` en `50-claude/settings.template.json` y sus binarios (TypeScript, Rust) en `bootstrap.ps1`: sin los binarios los plugins LSP fallan al arrancar — cuando se activen los plugins LSP en esta PC
- [ ] Reglas `ask` concretas para lo que importa en `C:`, en `~/.claude/settings.json` y, si valen en cualquier PC, en `50-claude/settings.template.json`: se quitó la regla `ask` de Edit sobre todo el perfil porque pedía aprobación en cada edición — la próxima vez que se toque la plantilla de settings
- [ ] Numerar las carpetas de dotfiles-parrot como aquí — en la próxima sesión de trabajo en Parrot
- [ ] Que dotfiles-parrot tome la capa de Claude de este repo en vez de mantener una copia — en la próxima sesión de trabajo en Parrot
- [ ] Que el otro repo con panel propio use `~/.claude/panel/` para la vista Tareas y conserve su vista Estilo como extensión: hoy son dos copias de la página que se desalinean — la próxima vez que se toque el panel de ese repo
- [ ] Documentar cómo llamar a `50-claude/panel/check.mjs` desde el CI de un repo con panel, para que falle con tareas mal escritas — cuando un segundo repo use el panel global
