[English](comments.md) | **Español**

# Comentarios de código

Cómo se escriben los comentarios en este repo: PowerShell, JavaScript (`.mjs`),
shell, JSON con comentarios, YAML y los archivos de configuración que admiten
comentarios. Se escriben en inglés, para que el código se lea igual para
cualquiera que lo abra.

## Fuentes

Las reglas salen de comparar cinco guías de estilo. Donde no coinciden, la tabla
dice cuál sigue este repo.

| Tema | Google (Shell, JS, TS) | PowerShell Practice and Style | Microsoft | Kernel de Linux | Este repo |
|---|---|---|---|---|---|
| Cabecera de archivo | Obligatoria: "a description of its contents" (Shell); `@fileoverview` opcional (JS, TS) | Ayuda basada en comentarios en cada script | Ayuda al principio del script (`about_Comment_Based_Help`) | — | Obligatoria y corta: qué es, por qué existe, dónde encaja |
| Comentario de función | Obligatorio salvo si es "obvious and short"; argumentos, salidas y retornos (Shell) | Ayuda en cada función; como mínimo la sinopsis | `.SYNOPSIS`, `.PARAMETER`, `.EXAMPLE` | En la cabecera de la función: qué hace y quizá por qué | JSDoc o ayuda basada en comentarios cuando el nombre y la firma no bastan |
| Dentro del cuerpo | "Tricky, non-obvious, interesting or important parts"; "Don't comment everything" | Explicar el razonamiento, no el comando | — | Evitarlos; nunca explicar el cómo | Solo el porqué: decisiones, límites, incidentes |
| Repetir el código | "Avoid comments that just restate the parameter name and type" (TS) | "Do not write: # Increment Margin by 2" | — | Nada de plantilla que repita la firma | Nunca |
| Ancho de línea | 80 columnas | — | — | 80 columnas | El límite del código: 100 (`printWidth`) |

[PowerShell Practice and Style](https://poshcode.gitbook.io/powershell-practice-and-style/)
es una guía de la comunidad en el sitio de PoshCode, no de Microsoft; la
referencia de Microsoft es [about_Comment_Based_Help](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_comment_based_help)
y, para TypeScript, [TSDoc](https://tsdoc.org/). Las demás:
[Google Shell](https://google.github.io/styleguide/shellguide.html),
[Google JavaScript](https://google.github.io/styleguide/jsguide.html),
[Google TypeScript](https://google.github.io/styleguide/tsguide.html) y el
[kernel de Linux](https://www.kernel.org/doc/html/latest/process/coding-style.html).

## Cabecera de archivo

Todo archivo de código empieza con una cabecera corta: qué es, por qué existe y
dónde encaja (quién lo llama, de qué depende). De dos a seis líneas.

- Va después de lo que tiene que ir primero: el shebang, `// @ts-check`,
  `#Requires`.
- No repite el nombre del archivo ni su ruta: el archivo ya los tiene.
- No copia el README (uso, requisitos) ni guarda historia (fechas, autores,
  «antes hacía…»): eso vive en el README y en git.

```js
#!/usr/bin/env node
// PreToolUse hook for Bash and PowerShell: blocks file edits made through the shell.
//
// ~/.claude/CLAUDE.md asks for Edit or Write; as an instruction it can be overridden
// mid-session, so this hook enforces the clear cases. Output sent to a temp folder passes.
```

Un script de PowerShell que ejecutan personas lleva ayuda basada en comentarios,
para que `Get-Help .\script.ps1` funcione:

```powershell
#Requires -Version 5.1
<#
.SYNOPSIS
  Links each configuration file in the repo to where its program reads it.

.DESCRIPTION
  Idempotent: an existing file is moved to a .pre-dotfiles.bak backup first.

.EXAMPLE
  .\install.ps1 -Check
#>
```

Una biblioteca que se carga con dot-sourcing (`lib/`) y un archivo de
configuración llevan una cabecera simple con `#`.

## Comentarios de función y de tipo

Se documenta una función cuando su nombre y su firma no dicen todo lo que
necesita quien la llama: un efecto, un límite, un error que lanza.

- JavaScript: JSDoc (`/** … */`) encima de la función. La primera frase es el
  resumen. `@param` y `@returns` solo cuando añaden algo al nombre; el `{type}`
  se mantiene donde `// @ts-check` lo usa para comprobar tipos.
- PowerShell: ayuda basada en comentarios al principio del cuerpo de la función.
  `.SYNOPSIS` en una línea; `.PARAMETER` solo cuando el nombre no basta.
- Una función interna corta con un nombre claro no necesita comentario.

```js
/**
 * Masks the content of quoted strings with `_`, keeping the length: a `>` inside a
 * string is not a redirection, and indexes still point to the same place.
 */
function maskQuotes(command) {}
```

## Comentarios dentro del cuerpo

Solo el **porqué**: la decisión detrás de una línea, un límite, un rodeo, el
incidente que evita. Nunca el **qué**: el código ya lo dice, y un comentario que
lo repite queda desfasado la primera vez que el código cambia.

```powershell
# Delete() never follows the link into its target folder; Remove-Item on a directory
# link can.
(Get-Item -LiteralPath $Target -Force).Delete()
```

- Encima del código que explica, no al final de la línea, salvo una nota corta
  (dos espacios antes de `#` en PowerShell).
- Un comentario por bloque, no uno por línea.
- Una sección de un script largo es una línea en blanco y un comentario de una
  línea, nunca un banner.

## Forma

- Inglés, frases completas, en presente, con palabras sencillas.
- Dentro del límite de línea del código: 100 columnas (`.prettierrc.json`).
- Sin banners (`# ----- X -----`, `# =====`), recuadros, emojis ni mayúsculas
  decorativas.
- Sin código comentado: git lo guarda.
- `TODO` solo con la condición que lo cierra (`TODO: remove when …`); el trabajo
  pendiente va a `docs/tasks.md`.
- Los `.ps1` siguen en ASCII: Windows PowerShell 5.1 lee mal el UTF-8 sin BOM.

## Otros textos del código

| Texto | Idioma | Por qué |
|---|---|---|
| Salida de los scripts (`install.ps1`, `bootstrap.ps1`, `tools/`) y nombres de los pasos del CI | Inglés | Un solo texto que los dos idiomas de la documentación citan tal cual, y los `.ps1` son ASCII, donde el español pierde las tildes |
| Mensajes de los hooks (`reason`) | Inglés, cortos y terminando en la acción a tomar | Los lee Claude, que igualmente responde al usuario en español |
| Nombres de los tests | Inglés | Son código, y el CI los imprime |
| Texto del panel de tareas y los títulos que lee de `docs/tasks.md` | Español | `docs/tasks.md` se escribe en español |

## Qué no se comenta

- Lo que ya dicen el código, un nombre o un tipo.
- La historia: qué hacía antes el código, quién lo cambió, cuándo. Eso es git.
- Datos personales o de la máquina (usuarios, rutas, hosts): el repo es público.
- Lo que el comentario no puede mantener cierto: un comentario que contradice el
  código es peor que ninguno, así que un cambio actualiza sus comentarios en el
  mismo commit.

## Lo aprendido en la migración

Este repo pasó el texto de su código del español al inglés carpeta por carpeta,
con un commit por carpeta, como piloto para los demás repos.

### Las seis decisiones

1. La salida de los scripts y los nombres de los pasos del CI van en inglés: un
   solo texto que los dos idiomas de la documentación citan tal cual, y los
   `.ps1` son ASCII y no pueden llevar las tildes del español.
2. Los mensajes de los hooks (`reason`) van en inglés, cortos y terminando en la
   acción a tomar: los lee Claude, que igualmente responde al usuario en español.
3. Los nombres de los tests van en inglés: son código, y el CI los imprime.
4. Entran los archivos de configuración con comentarios (`.gitignore`,
   `.editorconfig`, `.psd1`, el `settings.json` de VS Code, Dependabot): quien
   lee el repo se los encuentra como a cualquier script.
5. El texto visible del panel de tareas y los títulos que lee de
   `docs/tasks.md` siguen en español, porque `docs/tasks.md` se escribe en
   español; del panel solo cambiaron los comentarios.
6. `40-format/` cambió en dotfiles-parrot en el mismo paso, para que las dos
   copias sigan idénticas byte a byte.

### Lo que aprendimos

- Escribir la regla de idioma en el `CLAUDE.md` del repo antes de migrar. Una
  regla global que siga diciendo «comentarios en español» haría que la próxima
  sesión los volviera a escribir en español.
- Buscar qué lee un texto antes de traducirlo. Aquí nada analizaba la salida de
  los scripts (quien los llama usa el código de salida), y ningún ruleset exigía
  el check del CI por su nombre viejo.
- Recorrer todos los archivos versionados, no una lista de carpetas: `15-git/`
  faltaba en el plan y solo apareció en ese recorrido.
- Un archivo compartido con otro repo cambia en los dos en el mismo paso,
  siguiendo las reglas de ese repo: los commits de dotfiles-parrot los firma su
  dueño.
- El inglés no hizo crecer los archivos: los hooks con tope de líneas
  (`50-claude/check-budget.mjs`) cambiaron como mucho una línea.
- `tools/check-comments.mjs` conserva el resultado. Sobre el código de antes de
  la migración marca 249 comentarios, y ninguno sobre el de después. Se le
  escapan las etiquetas de una o dos palabras sin palabras funcionales ni
  tildes, como `Selector segmentado (tema)`, así que esas hay que mirarlas en la
  revisión.
