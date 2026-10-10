[English](README.md) | **Español**

# Capa global de Claude Code

Comportamiento **universal** de Claude Code, igual en cualquier proyecto, PC y sistema
operativo. Lo específico de un proyecto vive en el repo de ese proyecto; lo específico de una
máquina se queda local (no se versiona).

## Qué hay aquí (genérico, sin datos personales)

| Archivo | Enlazado a | Qué es |
|---|---|---|
| `CLAUDE.md` | `~/.claude/CLAUDE.md` | Reglas universales: documentación bilingüe, disco, editar con Edit/Write, confirmar antes de borrar, interacción, compactación |
| `statusline.mjs` | `~/.claude/statusline.mjs` | Barra de estado (modelo, contexto en tokens, carpeta) |
| `hooks/block-shell-edits.mjs` | `~/.claude/hooks/block-shell-edits.mjs` | Hook `PreToolUse` que impone editar con Edit/Write (bloquea `sed -i`, redirecciones, heredocs… y deja pasar temporales). Portable Windows/Linux |
| `hooks/block-forbidden-commands.mjs` | `~/.claude/hooks/block-forbidden-commands.mjs` | Hook `PreToolUse` que impone las reglas de `CLAUDE.md` sobre comandos: bloquea el git de escritura, `prettier --write` con un glob y `robocopy /MIR` sin `/XJ`, y pregunta antes de un borrado recursivo fuera de un temporal. Portable Windows/Linux |
| `hooks/reply-in-spanish.mjs` | `~/.claude/hooks/reply-in-spanish.mjs` | Hook `Stop` que bloquea una respuesta escrita en inglés y pide rehacerla en español (ignora código, rutas e identificadores). Portable Windows/Linux |
| `settings.template.json` | — (plantilla) | Base portable de `settings.json`: `deny`/`ask` de secretos genéricos + registro del hook + `skillOverrides` |
| `check-budget.mjs` | — (script) | Guarda de presupuesto: cuenta líneas de `CLAUDE.md`/`statusline`/`hook` y falla si exceden. `node claude/check-budget.mjs`. Portable |
| `tasks-artifact.template.html` | — (plantilla) | Diseño fijo del artefacto de tareas que `CLAUDE.md` pide en los trabajos de varios bloques: Claude lo copia, rellena el contenido y no lo rediseña |

## Qué NO se versiona (queda local, por máquina)

- **`~/.claude/entorno.md`**: detalle físico de la máquina (discos, rutas, usuario) y datos
  privados. Cada PC tiene el suyo. **Nunca** va a un repo público.
- **`~/.claude/settings.json`**: tiene rutas con tu usuario, `autoMode` (que genera cada
  máquina y solo se lee del settings global) y plugins. Se queda local.
- Historial, sesiones, memoria (`~/.claude/projects/**`), cachés, `file-history`.

## Montar en una máquina nueva (Windows o Linux)

1. Clonar el repo y correr el instalador: enlaza los archivos de arriba a `~/.claude/`.
    - Windows: `./install.ps1` (necesita Developer Mode o admin para symlinks).
2. Crear `~/.claude/settings.json` a partir de `settings.template.json`:
    - Reemplazar `REEMPLAZA_RUTA_HOME` por el home real (Windows `C:/Users/<user>`,
      Linux `/home/<user>`). Las rutas de los hooks van entre comillas, así que un home
      con espacios funciona.
    - Edita este archivo tú: un hook enlazado no se ejecuta hasta registrarlo aquí, y el
      modo automático no deja que Claude cambie su propia configuración.
    - Opcional (más fiable en Windows): añadir también rutas **absolutas** de tus secretos,
      p. ej. `Read(//d/Dev/security-keys/**)`, junto a los patrones `**/` genéricos.
3. Crear tu `~/.claude/entorno.md` local con el detalle de esa máquina (no se versiona).

Los patrones de secretos usan `**/` (portables Windows/Linux) y no contienen ningún dato
personal. El `deny` bloquea en seco claves/credenciales; `.env*` queda en `ask` (pregunta
antes de leer, para poder guiar sin exponer valores en el contexto).
