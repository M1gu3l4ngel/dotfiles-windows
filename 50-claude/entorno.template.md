# Entorno — detalle de la máquina

Plantilla de `~/.claude/entorno.md`. Se copia a mano en cada PC y se rellena con
lo de esa máquina; la copia **no se versiona** (rutas, usuario y proyectos son
datos personales). El `CLAUDE.md` global pide leerla antes de operar fuera de un
repo. Lo que vale en cualquier PC no va aquí: va en el `CLAUDE.md` global.

## Los discos

- `C:`: sistema y programas. Capacidad y espacio libre aproximado.
- `<disco de trabajo>`: proyectos, cachés y globales. Si la PC tiene un solo
  disco, todo va en `C:\Dev`.

## Dónde va cada cosa

| Qué | Dónde |
|---|---|
| Proyectos con git | `<disco>\Dev\projects\` |
| Experimentos sin git | `<disco>\Dev\scratch\` |
| Cachés (npm, pnpm, cargo, NuGet) | Las rutas de las variables de abajo |

## El scratchpad de Claude Code

Para archivos pequeños de una sesión. Lo que pase de ~50 MB va a
`<disco>\Dev\scratch\`.

## Variables de entorno ya configuradas

Las que fija `bootstrap.ps1` (`CARGO_HOME`, `RUSTUP_HOME`, `NUGET_PACKAGES`,
`PUPPETEER_CACHE_DIR`, prefix y caché de npm, store de pnpm) y cualquier otra
propia de esta máquina, con su valor.

## Proyectos actuales

Una línea por proyecto: carpeta, qué es y lo que haya que saber antes de tocarlo.

## Cosas que NO hay que tocar

Carpetas, servicios o configuraciones de esta máquina que no se mueven ni se
borran, con su motivo.

## Trampas conocidas de este equipo

Lo que ya falló aquí y cómo se evita (junctions, permisos, rutas largas,
antivirus…).

## Antes de borrar cualquier cosa

- Trabajo en el disco de trabajo: preguntar siempre.
- Sin `.git`: copiar y verificar recuento y bytes antes de borrar.
- `Remove-Item -Force` no usa papelera y atraviesa junctions.
