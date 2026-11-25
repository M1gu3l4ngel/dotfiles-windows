[English](README.md) | **Español**

# Capa global de Claude Code

Comportamiento **universal** de Claude Code, igual en cualquier proyecto, PC y sistema
operativo. Lo específico de un proyecto vive en el repo de ese proyecto; lo específico de una
máquina se queda local (no se versiona).

## Qué hay aquí (genérico, sin datos personales)

| Archivo | Enlazado a | Qué es |
|---|---|---|
| `CLAUDE.md` | `~/.claude/CLAUDE.md` | Reglas universales: documentación bilingüe, carpeta de trabajo, editar con Edit/Write, confirmar antes de borrar, interacción, compactación |
| `rules/repo-conventions.md` | `~/.claude/rules/repo-conventions.md` | Regla global (en español, se carga en todos los proyectos): lo que tiene todo repo, y avisar como hallazgo lo que falte |
| `skills/new-repo/` | `~/.claude/skills/new-repo` | Skill global (en español): crea un repo bien armado, o completa uno existente: descripción y topics en GitHub, protección de `main`, licencia, README bilingüe con diagrama, CHANGELOG, `CLAUDE.md`, formato, CI y el catálogo del cerebro de la organización. Su `docs-standard.md` es el estándar de documentación de todos los repos (qué archivos lleva cada tipo de repo, el orden de sus secciones y cómo se escriben), con plantillas bilingües en `templates/`. Lo de cada empresa vive en su cerebro |
| `statusline.mjs` | `~/.claude/statusline.mjs` | Barra de estado (modelo, contexto en tokens, carpeta) |
| `hooks/block-shell-edits.mjs` | `~/.claude/hooks/block-shell-edits.mjs` | Hook `PreToolUse` que impone editar con Edit/Write (bloquea `sed -i`, redirecciones, heredocs… y deja pasar temporales). Portable Windows/Linux |
| `hooks/block-forbidden-commands.mjs` | `~/.claude/hooks/block-forbidden-commands.mjs` | Hook `PreToolUse` que impone las reglas de `CLAUDE.md` sobre comandos: bloquea los commits sin firma, `git add -A`, los push forzados, los push a `main`, el git que reescribe historia o árbol y borrar, mover o crear sin firma una etiqueta (crear una firmada pasa), `prettier --write` con un glob y `robocopy /MIR` sin `/XJ`; deja sacar archivos del índice con `git reset -- <rutas>`; pregunta antes de cualquier otro push, de un `git pull --ff-only`, de un reset que no toca los archivos (`--soft`, `--mixed`) y de un borrado recursivo fuera de un temporal. Sus reglas salen de `command-rules.mjs`. Portable Windows/Linux |
| `hooks/command-rules.mjs` | `~/.claude/hooks/command-rules.mjs` | Fuente única de las reglas universales de comandos. El hook de cada proyecto lleva una copia idéntica, porque viaja a proyectos extraídos sin estos dotfiles; el check `hook-rules-copy` del proyecto falla si las copias difieren. Se edita aquí y se copia entera |
| `hooks.local.example.json` | — (ejemplo) | Forma de `~/.claude/hooks.local.json`: los repos cuya única rama es `main` (`owner/repo`), en los que el hook deja subir a `main`. Sin ese archivo ningún repo tiene la excepción |
| `hooks/reply-in-spanish.mjs` | `~/.claude/hooks/reply-in-spanish.mjs` | Hook `PostToolUse` y `Stop` que mantiene las respuestas en español: tras cada herramienta avisa a Claude si lo último que escribió está en inglés, y bloquea un turno que termina en inglés. Juzga el final del turno e ignora código, rutas e identificadores. Portable Windows/Linux |
| `settings.template.json` | — (plantilla) | Base portable de `settings.json`: `deny`/`ask` de secretos genéricos, registro de los hooks y de la barra de estado, `skillOverrides` y las preferencias que valen en cualquier PC (`theme`, `tui`, `autoUpdatesChannel`) |
| `check-budget.mjs` | — (script) | Guarda de presupuesto: cuenta las líneas de `CLAUDE.md`, la línea de estado, los hooks, la regla y el skill, y falla si exceden. Lo corren `tools/check.ps1` y el CI; suelto: `node 50-claude/check-budget.mjs`. Portable |
| `panel/` | `~/.claude/panel` | Panel de tareas: un artefacto generado desde `docs/tasks.md` y `docs/backlog.md` de un repo, con sus hooks. Cada repo lo activa con `.claude/panel.json`. Ver [panel/README.es.md](panel/README.es.md) |
| `links.json` | — (datos) | Los enlaces de la capa: `source` relativo a `50-claude/`, `target` relativo a `~/.claude/` y una `label`. Lo leen `lib/links.ps1` aquí y `lib/links.sh` en dotfiles-parrot, así que una pieza nueva llega a los dos sistemas con una sola entrada |
| `tools/` | `~/.claude/tools` | Scripts compartidos que cualquier repo o instalador corre con `node`, cada uno con sus tests |
| `tools/check-comments.mjs` | (dentro de `tools/`) | Falla ante un comentario de código en español e imprime sus exenciones; un repo lo configura con `.claude/comments.json`. Ver [docs/contributing/comments.es.md](../docs/contributing/comments.es.md#el-check-en-cualquier-repo). Portable |
| `tools/check-docs.mjs` | (dentro de `tools/`) | Falla si los docs bilingües se desalinean: pareja o selector que falta, títulos, filas de tabla, elementos de lista, bloques de código o enlaces distintos, enlaces o anclas rotos. Deja fuera todo `CLAUDE.md`, `.claude/` y las listas de tareas; un repo añade las suyas con `--exclude`. Portable |
| `tools/install-settings.mjs` | (dentro de `tools/`) | Crea `~/.claude/settings.json` desde la plantilla, o le añade los hooks y las reglas `deny`/`ask` que le faltan, con un backup fechado; `--check` solo informa. Lo llama el instalador de cada sistema (`install.ps1` aquí, `install.sh` en dotfiles-parrot). Portable |
| `entorno.template.md` | — (plantilla) | Secciones del `~/.claude/entorno.md` local (en español, como `CLAUDE.md`), válidas en Windows y en Linux, sin datos de ninguna máquina |

## Qué NO se versiona (queda local, por máquina)

- **`~/.claude/entorno.md`**: detalle físico de la máquina (discos, rutas, usuario) y datos
  privados. Cada PC tiene el suyo. **Nunca** va a un repo público.
- **`~/.claude/settings.json`**: tiene rutas con tu usuario, `autoMode` (que genera cada
  máquina y solo se lee del settings global) y plugins. Se queda local.
- **`~/.claude/hooks.local.json`**: ajustes personales de los hooks (nombra tus
  repos). Se crea a mano desde `hooks.local.example.json`.
- Historial, sesiones, memoria (`~/.claude/projects/**`), cachés, `file-history`.

## Montar en una máquina nueva (Windows o Linux)

Cada sistema tiene su instalador: `.\install.ps1` de este repo en Windows
(necesita Developer Mode o admin para los symlinks), y `./install.sh` de
[dotfiles-parrot](https://github.com/M1gu3l4ngel/dotfiles-parrot) en Linux, que
enlaza esta carpeta desde un clon de este repo. Los dos cumplen el mismo contrato,
así que la capa es la misma en todas las máquinas:

1. **Enlaces.** Cada entrada de `links.json` se convierte en un symlink de
   `50-claude/<source>` a `~/.claude/<target>`; las carpetas se enlazan enteras.
   Un archivo real que estorbe se mueve antes a `<archivo>.pre-dotfiles.bak`.
2. **Settings.** `~/.claude/settings.json` se fusiona, nunca se enlaza, con
   `tools/install-settings.mjs`:
    - Si la máquina no tiene uno, se crea desde `settings.template.json` con
      `REEMPLAZA_RUTA_HOME` cambiado por el home real (`C:/Users/<user>` o
      `/home/<user>`). Las rutas de los hooks van entre comillas, así que un home
      con espacios funciona.
    - Si ya existe, solo se le añaden los hooks y las reglas `deny`/`ask` de la
      plantilla que le faltan (un hook enlazado no se ejecuta hasta registrarlo
      aquí, y una regla de seguridad nueva tiene que llegar a todas las máquinas),
      con un backup `.pre-dotfiles.bak` con fecha antes; lo demás del archivo queda
      como estaba.
    - Opcional (más fiable en Windows): añadir también rutas **absolutas** de tus secretos,
      p. ej. `Read(//d/Dev/security-keys/**)`, junto a los patrones `**/` genéricos.
3. **Comprobación.** Un modo que no cambia nada informa de los enlaces y de los
   settings (`.\install.ps1 -Check` aquí). La parte de los settings es el mismo
   comando en cualquier sistema:

    ```bash
    node ~/.claude/tools/install-settings.mjs --check
    ```

4. **Tras cada pull.** Un hook `post-merge` de git vuelve a correr el instalador,
   así que un enlace, hook o regla nuevos llegan a todas las máquinas con el pull.
5. **Archivos locales.** Crear tu `~/.claude/entorno.md` con el detalle de esa
   máquina (no se versiona), copiando las secciones de `entorno.template.md`, y, si
   lo necesitas, `~/.claude/hooks.local.json` desde `hooks.local.example.json`.

Los patrones de secretos usan `**/` (portables Windows/Linux) y no contienen ningún dato
personal. El `deny` bloquea en seco claves/credenciales; `.env*` queda en `ask` (pregunta
antes de leer, para poder guiar sin exponer valores en el contexto).
