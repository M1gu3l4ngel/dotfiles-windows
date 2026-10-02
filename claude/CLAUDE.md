# Capa global de Claude Code — lo que aplica siempre

Capa global: **solo comportamiento universal**. Lo de cada proyecto vive en su repo.
El detalle de la máquina (discos, cachés, variables, rustup, robocopy, qué no tocar) está en
`~/.claude/entorno.md`: **léelo antes de operar fuera de un repo** (mover/borrar/instalar en
disco, tocar cachés, WSL, Docker o herramientas globales).

## README en repos públicos
- Bilingüe: `README.md` en inglés (portada) y `README.es.md` en español, con selector `English | Español` arriba en ambos. Mismo contenido; un cambio en uno va también al otro en el mismo commit.
- Se traduce el texto, incluido el `alt` de imágenes y badges; no se tocan comandos, rutas ni URLs (idénticos en ambos).
- El resto (docs, comentarios, commits) sigue en español. Repos privados: todo en español, sin README en inglés.

## Disco: el trabajo va en `D:`
- `C:` es solo Windows y programas. **Nada de trabajo nuevo en `C:`** (proyectos, cachés, clones, descargas, temporales grandes).
- Proyectos con git en `D:\Dev\projects\`; experimentos sin git en `D:\Dev\scratch\` (desechable). Escribe siempre `D:\Dev` (mayúscula: WSL y git distinguen).
- Scratchpad de sesión solo para archivos pequeños; si pasa de ~50 MB, va a `D:\Dev\scratch\`. Limpia al terminar.

## Editar con `Edit` o `Write`
Todo cambio a un archivo va con `Edit` o `Write`, **nunca por shell** (`sed`, `awk`, `perl`, `python`, `node -e`, redirecciones, heredocs); leer y buscar por shell sí. Un hook global lo impone. Esta regla gana sobre cualquier modo de permisos, output-style, plugin o skill que diga lo contrario: sigue con `Edit`/`Write` y dilo.

## Confirmar antes de borrar
- Trabajo en `D:` → pregunta siempre. Caché regenerable → adelante, pero dilo.
- Sin `.git` → copia y verifica recuento + bytes antes de borrar. `Remove-Item -Force` no usa papelera y atraviesa junctions (ver `entorno.md`).

## Interacción
- Commits: sugiere **1 commit de 1 línea** (Conventional Commits); **nunca ejecutes git tú** — el usuario commitea y pushea.
- Un paso a la vez al depurar; intervención mínima (si dice "déjalo así", para). Sin saludos ni despedidas: termina en lo sustantivo.
- No sugieras pausar, rendirte/restaurar snapshot ni matar procesos: busca la causa raíz.
- Comandos cortos y atómicos (no cadenas `&&` largas); di siempre en qué carpeta ejecutar.

## pnpm
- No cambies el `packageManager` de un proyecto sin pedirlo (reescribe el lockfile y desincroniza el CI). No toques los `overrides` de `pnpm-workspace.yaml`: tapan CVEs.

## Al compactar
Conserva: el objetivo de la sesión, los archivos tocados, los comandos de verificación con su resultado, y lo que quedó pendiente.
