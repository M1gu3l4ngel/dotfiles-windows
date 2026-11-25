# Tareas pendientes — dotfiles-windows

Solo lo que falta: lo hecho se borra. Formato y reglas en
`.claude/rules/task-tracking.md`; el panel de tareas es una vista de este archivo.

# Por probar

## Terminales de esta PC

**Plataforma:** Shell.

- [ ] [Esta PC] Una terminal nueva de PowerShell 7, de Windows PowerShell y de Git Bash abre con el prompt de siempre
- [ ] [Esta PC] Windows Terminal abre con PowerShell 7, Monokai Soda y la fuente de siempre

## Instalación en una PC nueva

**Plataforma:** Instalación.

- [ ] [PC nueva] `docs/getting-started` funciona de principio a fin en un Windows 11 limpio, sin pasos que falten
- [ ] [PC nueva] `bootstrap.ps1` instala las 18 apps de `60-apps/essential.json`
- [ ] [PC nueva] `bootstrap.ps1` instala las 39 extensiones de VS Code y los `.ps1` se formatean al guardar
- [ ] [PC nueva] `.\bootstrap.ps1` crea `~/.claude/settings.json` con la plantilla (ahora lo hace `install-settings.mjs`)
- [ ] [PC nueva] Tras un `git pull` en otra PC, el `post-merge` rehace los enlaces y el prompt sigue igual

## README y archivos de comunidad en GitHub

**Plataforma:** Repositorio.

- [ ] El README muestra el logo oscuro con el tema claro y el blanco con el tema oscuro, en inglés y en español
- [ ] Los diagramas del README y de `docs/getting-started` se dibujan en tema claro y oscuro
- [ ] La fila de enlaces de la cabecera lleva a cada sección (Structure, How it works, Getting started, Usage, Documentation, Contributing, Security, License), en los dos idiomas
- [ ] «New issue» ofrece los formularios de error y de mejora y el enlace de vulnerabilidad, sin issue en blanco
- [ ] Tras activar el reporte privado, Security → «Report a vulnerability» abre el formulario

## Repos con new-repo y el estándar de documentación

**Plataforma:** Claude Code.

- [ ] Al pedir un repo nuevo, Claude usa `new-repo`: pregunta dueño y visibilidad juntos y confirma antes de `gh repo create`
- [ ] El repo nace con descripción, topics, licencia, `CLAUDE.md`, formato, CI y los archivos de su tipo copiados de `templates/`, sin `<placeholder>` sin rellenar
- [ ] En un repo de una organización con cerebro, lo registra en su catálogo
- [ ] En un repo existente, Claude avisa como hallazgo cada archivo que falta o sección fuera de orden

## Comportamiento de Claude en una sesión nueva

**Plataforma:** Claude Code.

- [ ] Claude pone el trabajo en la carpeta de trabajo de `entorno.md` y dice con qué privilegios corre cada comando que te pide
- [ ] En este repo, Claude escribe en inglés los comentarios nuevos y dice al empezar si el panel está al día

## Panel de tareas

**Plataforma:** Claude Code.

- [ ] [Esta PC] El panel abre con las tareas de este archivo y el backlog
- [ ] [Esta PC] El selector Claro/Oscuro cambia el tema y se recuerda al recargar
- [ ] [Esta PC] «Por probar» muestra una tarjeta por plataforma y el filtro de dispositivo
- [ ] [Esta PC] Buscar abre los bloques con resultados y resalta el texto

---

# Lo hace el dueño

- [ ] Activar el reporte privado de vulnerabilidades que promete `SECURITY.md` (hoy está apagado), en PowerShell como usuario normal: `gh api -X PUT repos/M1gu3l4ngel/dotfiles-windows/private-vulnerability-reporting`

# Aplazado — cada uno con el evento que lo dispara

- [ ] Leer el nombre y el correo de git de parámetros de `bootstrap.ps1` (`Invoke-Step6Git`), con los del dueño por defecto: hoy quien haga un fork firma con una identidad ajena si no lo cambia antes, y `docs/getting-started` solo lo avisa — antes de anunciar el repo o cuando alguien haga un fork
- [ ] Script idempotente de ajustes de Windows, con `-DryRun`: el modo de desarrollador y los ajustes del registro se hacen a mano en una PC nueva — en la próxima PC nueva
- [ ] Enlazar en WSL un `.bashrc` que cargue oh-my-posh con el tema del repo: Ubuntu 26.04 trae el de serie (`.claude/rules/environment.md`) — cuando se trabaje en WSL a diario
- [ ] `enabledPlugins` en `50-claude/settings.template.json` y sus binarios (TypeScript, Rust) en `bootstrap.ps1`: sin los binarios los plugins LSP fallan al arrancar — cuando se activen los plugins LSP en esta PC
- [ ] Reglas `ask` concretas para lo que importa en `C:`, en `~/.claude/settings.json` y, si valen en cualquier PC, en `50-claude/settings.template.json`: se quitó la regla `ask` de Edit sobre todo el perfil porque pedía aprobación en cada edición — la próxima vez que se toque la plantilla de settings
- [ ] Que el otro repo con panel propio use `~/.claude/panel/` para la vista Tareas y conserve su vista Estilo como extensión: hoy son dos copias de la página que se desalinean — la próxima vez que se toque el panel de ese repo
- [ ] Documentar cómo llamar a `50-claude/panel/check.mjs` desde el CI de un repo con panel, para que falle con tareas mal escritas — cuando un segundo repo use el panel global
