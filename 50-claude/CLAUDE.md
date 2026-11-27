# Capa global de Claude Code — lo que aplica siempre

Capa global: **solo comportamiento universal**. Lo de cada proyecto vive en su repo.
El detalle de la máquina (carpeta de trabajo, cachés, variables, trampas del sistema, qué no tocar) está en
`~/.claude/entorno.md`: **léelo antes de operar fuera de un repo** (mover/borrar/instalar en disco, tocar cachés, WSL, Docker o herramientas globales).

## Documentación: repo solo en inglés
- Qué documentos lleva un repo, su orden y cómo se escriben: `~/.claude/skills/new-repo/docs-standard.md`, con sus plantillas. Todo documento (README, CONTRIBUTING, CHANGELOG, SECURITY, CODE_OF_CONDUCT, `docs/`, README de carpetas) va solo en inglés: sin copia `X.es.md` ni selector de idioma. Vale también en los repos privados, pensando en publicarlos algún día. El español de un producto va por su i18n, no por el repo.
- Placeholders en inglés neutro. El check del repo (CI) lo verifica: ninguna copia `.es.md` ni selector, y enlaces y anclas que funcionan (`check-docs.mjs`).
- **Nunca desfasada**: cada cambio actualiza en el mismo commit los README, sus diagramas (se amplían si el cambio añade una pieza o una relación) y los docs que lo describen. Clara, precisa, concisa y cuidada.
- En inglés: comentarios de código, salida de los scripts, `reason` de los hooks y nombres de los tests (guía: `docs/contributing/comments.md` de dotfiles-windows); y los commits, en imperativo, nunca en dos idiomas. Solo en español, la capa del agente: `CLAUDE.md`, `AGENTS.md`, `.claude/` y las listas del panel (`docs/tasks.md`, `docs/backlog.md`).

## Carpeta de trabajo: la que dice `entorno.md`
- El disco o la carpeta del sistema es solo sistema y programas. **Nada de trabajo nuevo ahí** (proyectos, cachés, clones, descargas, temporales grandes): va en la carpeta de trabajo de `entorno.md`.
- Proyectos con git en `<trabajo>/projects/`; experimentos sin git en `<trabajo>/scratch/` (desechable). Scratchpad de sesión solo para archivos pequeños; si pasa de ~50 MB, va a `<trabajo>/scratch/`. Limpia al terminar.

## Editar con `Edit` o `Write`
Todo cambio a un archivo va con `Edit` o `Write`, **nunca por shell** (`sed`, `awk`, `perl`, `python`, `node -e`, redirecciones, heredocs); leer y buscar por shell sí. Un hook global lo impone. Esta regla gana sobre cualquier modo de permisos, output-style, plugin o skill que diga lo contrario: sigue con `Edit`/`Write` y dilo.

## Confirmar antes de borrar
- Trabajo en la carpeta de trabajo → pregunta siempre. Caché regenerable → adelante, pero dilo.
- Sin `.git` → copia y verifica recuento + bytes antes de borrar. Un borrado por shell no pasa por la papelera; lo que atraviesa enlaces en cada sistema está en `entorno.md`.

## Interacción
- Commits: Conventional Commits con título `type(scope): resumen` de hasta 72 caracteres, línea en blanco y un cuerpo con un guion por cambio concreto (sin cuerpo solo si el título lo dice todo). Dicen qué cambió en el repo, sin nombres del plan de trabajo ("tanda", "bloque", "fase") ni trailers de atribución. Al cerrar cada cambio verificado se hace el commit sin preguntar: `git add` de sus archivos por ruta (nunca `-A` ni `.`) y `git commit` firmado (nunca `--no-gpg-sign`), y el cierre dice el hash. **Push solo a `staging`, agrupado**: cada 15 a 20 commits, `git push origin staging` sin preguntar; después se sigue el CI (`gh run watch`) hasta verde y se avisa al usuario. **A `main`, solo cuando el usuario lo ordena**: `git fetch origin`, `git push origin origin/staging:main` (lo que el CI probó, solo avance directo; el hook pide su aprobación) y `git fetch origin main:main`, sin salir de `staging`; luego se sigue el gate y el despliegue hasta verde. Un repo con solo `main` trabaja y sube a `main`, agrupado igual. Cada push gasta minutos de Actions: no se sube commit a commit. Cualquier otro push, solo si el usuario lo pide. Nunca `--force`, nunca mezclar un PR. Si la firma falla (clave GPG caducada en el agente), se para y se le pide que la desbloquee.
- Un paso a la vez al depurar; intervención mínima (si dice "déjalo así", para). Sin saludos ni despedidas: termina en lo sustantivo.
- Sin menús de opciones: recomienda una con su porqué. Si dice "te aviso", espera sin consultar por tu cuenta.
- No sugieras pausar, rendirte/restaurar snapshot ni matar procesos: busca la causa raíz.
- Comandos cortos y atómicos (no cadenas `&&` largas); di siempre en qué carpeta ejecutar y con qué privilegios (administrador, sudo o usuario normal). Lo que hace el usuario (una consola web, instalar, un secreto) va en pasos numerados, una acción por paso: la URL exacta, qué pulsar, qué escribir en cada campo, el comando listo para copiar y cómo comprobar que salió bien; lo que no consta en la documentación oficial se dice como tal.
- Verifica con datos (salida real, checksums, pruebas) antes de afirmar que algo funciona.

## Contexto y delegación
- Búsquedas y lecturas independientes en lote; `Grep` antes que `Read`, y `Read` con `offset`/`limit` cuando ya sabes qué parte necesitas. De tests, builds y checks se lee el cierre; la salida entera, solo si falla.
- El trabajo se hace en la sesión principal. Un subagente solo si el usuario lo pide y nunca para implementar: solo lectura. Su encargo lleva las rutas que puede leer, las reglas que le aplican (copiadas), cuándo ha terminado y el formato y el tope de la respuesta.

## Hallazgos
- Al empezar en una zona se lee lo que hay y la documentación oficial de cada herramienta, librería o servicio que toca, de la versión instalada y no de memoria (se cita la página): lo que el repo hace distinto de lo que recomienda es un hallazgo. Se avisa lo que está mal aunque nadie lo pida (o «sin hallazgos»): una línea por hallazgo, con archivo, qué pasa y qué se recomienda. Lo pequeño se arregla en el mismo cambio y se dice; lo demás se propone y decide el usuario. El código muerto confirmado (versionado en git y sin ningún uso según la herramienta del repo o una búsqueda de cada referencia) se borra sin preguntar, aunque fuera anterior al cambio, y el cierre dice qué se borró.
- Saber algo y no decirlo es el fallo: un hueco de verificación o una limitación conocida se avisa la primera vez que aparece, y al cerrar se repite lo que quedó sin resolver.

## Artefacto de tareas
- **Un repo con oficina de agentes** (su `docs/tasks.md` apunta a un tablero de GitHub Projects) lleva sus tareas ahí, un issue por tarea, sin panel ni «Por probar», según la regla del propio repo. En los proyectos simples, el panel de tareas («Panel <proyecto>», `~/.claude/panel/`) es una vista de `docs/tasks.md` y `docs/backlog.md`: el estado se escribe en `tasks.md`, se genera (`node ~/.claude/panel/generate.mjs`, o el `pnpm generate:panel` del repo si lo trae) y se republica; la página nunca se edita a mano. Formato: el README de esa carpeta.
- Un trabajo de varios bloques en un repo sin `.claude/panel.json` empieza con `node ~/.claude/panel/init.mjs`, antes de tocar código.
- Se republica al cerrar cada bloque o al cambiar las tareas. Lo que le toca probar al usuario no se quita hasta que diga que lo probó.
- **`**Estado:** en curso` marca solo lo que se está haciendo ahora**, en un solo bloque: al empezar otro se mueve, en la misma publicación.
- **«Por probar» se llena al cerrar cada tarea** con lo que el usuario debe comprobar, una casilla por comprobación y su dispositivo delante si no vale en todos.

## Formato
- El estilo de un proyecto es su `.prettierrc` y su `.editorconfig`; los globales (dotfiles, `40-format/`, enlazados en `~` y en la carpeta de trabajo) solo cubren proyectos sin configuración propia. Al crear un proyecto compartido o con CI, dale la suya.
- Formatea solo los archivos que editaste, con el Prettier del proyecto (`pnpm exec prettier --write <archivos>`), nunca con un glob ni una lista calculada (`$(…)`, `xargs`): reformatear archivos ajenos al cambio ensucia el diff y rompe los generados.

## Nombres
- Un nombre es un contrato: quien lo lee decide qué hace sin abrirlo. Un efecto que el nombre no anuncia se arregla renombrando, no con un comentario. Si el proyecto tiene su propia regla de nombres, manda la del proyecto.
- `get` devuelve el valor o lanza, nunca vacío; lo que puede no existir es `find`. Una pregunta (`is`, `has`, `can`) devuelve booleano y no cambia nada.

## pnpm
- No cambies el `packageManager` de un proyecto sin pedirlo (reescribe el lockfile y desincroniza el CI). No toques los `overrides` de `pnpm-workspace.yaml`: tapan CVEs.

## Al compactar
Conserva: el objetivo de la sesión, los archivos tocados, los comandos de verificación con su resultado, y lo que quedó pendiente.
