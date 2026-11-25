# Entorno — detalle de la máquina

Plantilla de `~/.claude/entorno.md`. Se copia a mano en cada PC y se rellena con
lo de esa máquina; la copia **no se versiona** (rutas, usuario y proyectos son
datos personales). El `CLAUDE.md` global pide leerla antes de operar fuera de un
repo. Lo que vale en cualquier PC no va aquí: va en el `CLAUDE.md` global. Vale
para Windows y para Linux: se borra lo que no aplica.

## Sistema y discos

- Sistema operativo y versión.
- Disco o partición del sistema: solo sistema y programas. Capacidad y espacio
  libre aproximado.
- La carpeta de trabajo: proyectos, cachés y globales. En Windows suele ser
  `<disco>\Dev` (`C:\Dev` si la PC tiene un solo disco); en Linux, `~/Dev`.
  Si el sistema distingue mayúsculas en esa ruta (WSL, git), cómo se escribe.

## Dónde va cada cosa

| Qué | Dónde |
|---|---|
| Proyectos con git | `<trabajo>/projects/` |
| Experimentos sin git | `<trabajo>/scratch/` |
| Cachés (npm, pnpm, cargo, NuGet) | Las rutas de las variables de abajo |
| Temporales en RAM, si los hay | Por ejemplo `/tmp` en Linux con tmpfs |

## El scratchpad de Claude Code

Para archivos pequeños de una sesión. Lo que pase de ~50 MB va a
`<trabajo>/scratch/`.

## Variables de entorno ya configuradas

Las que fija el instalador de la máquina (`bootstrap.ps1` en Windows, el de
dotfiles-parrot en Linux: `CARGO_HOME`, `RUSTUP_HOME`, prefix y caché de npm,
store de pnpm…) y cualquier otra propia de esta máquina, con su valor.

## Privilegios

Qué necesita administrador (Windows) o `sudo` (Linux) en esta máquina, y qué se
hace siempre como usuario normal.

## Proyectos actuales

Una línea por proyecto: carpeta, qué es y lo que haya que saber antes de tocarlo.

## Cosas que NO hay que tocar

Carpetas, servicios o configuraciones de esta máquina que no se mueven ni se
borran, con su motivo.

## Trampas conocidas de este equipo

Lo que ya falló aquí y cómo se evita: enlaces que un borrado atraviesa
(junctions y `Remove-Item -Recurse` en Windows, `rm -r` siguiendo un symlink con
`/` final en Linux), copias que rompen symlinks (`robocopy` sin `/SL`), rutas
largas, permisos, antivirus…

## Antes de borrar cualquier cosa

- Trabajo en la carpeta de trabajo: preguntar siempre.
- Sin `.git`: copiar y verificar recuento y bytes antes de borrar.
- Un borrado por shell no pasa por la papelera (`Remove-Item -Force` en Windows,
  `rm` en Linux).
