# Entorno (Windows)

## Discos

- `C:` = sistema y programas. `D:` = trabajo (proyectos, cachés, globales).
- `bootstrap.ps1` detecta si existe `D:`; si no, usa `C:` (máquina de un solo
  disco). Las variables de entorno (CARGO_HOME, RUSTUP_HOME, NUGET_PACKAGES,
  PUPPETEER_CACHE_DIR, npm prefix/cache, pnpm store) apuntan a ese disco.

## Symlinks

- `install.ps1` crea symlinks con `New-Item -ItemType SymbolicLink`.
- Requiere **Developer Mode** activado (Settings → System → For developers) o
  ejecutar como administrador. Sin eso, la creación falla; el
  script lo valida antes de tocar nada.

## Toolchain y apps

- Node vía **fnm** (versiones en `<disco>\Dev\fnm`, `FNM_DIR`): cada terminal cambia a la versión
  del repo al entrar (perfiles de `10-shell/`), y `aliases\default` en el PATH cubre lo que
  arranca sin perfil. Globales (`pnpm`, `claude`) en `<disco>\Dev\npm-global`.
- Apps del entorno por **winget** (no choco, no scoop, no instaladores manuales).
- Módulos de PowerShell: `Install-Module -Scope CurrentUser` (sin admin).
- Fuente: **CaskaydiaCove Nerd Font** (tabla `$NerdFonts`, verificada por SHA-256).
- WSL: `bootstrap.ps1` instala `$WslDistro` (Ubuntu 26.04). Su `.bashrc` es el de
  serie: este repo aún no le configura el prompt (tarea en el backlog).

## Dónde vive el repo

- En `~\dotfiles` (`C:`), excepción explícita a la regla de que el trabajo va en
  `D:`: `~` existe en cualquier PC, también en una de un solo disco, y es la ruta
  que dan el README y la guía de PC nueva. El perfil y `.bashrc` sacan la ruta
  real de su enlace, así que clonarlo en otra carpeta también funciona.
- El clon de [dotfiles-parrot](https://github.com/M1gu3l4ngel/dotfiles-parrot)
  en esta PC vive al lado, en `~\dotfiles-parrot`, por la misma razón: sirve
  para editar las copias compartidas (`40-format/`, el prompt) en el mismo paso.
  Esta PC tiene `core.autocrlf=true` y Parrot no fija LF, así que su copia de
  trabajo sale en CRLF; en el repo sigue en LF.

## Prompt compartido con Parrot

El tema `10-shell/oh-my-posh/capr4n.omp.json` y la paleta de colores son **compartidos con
[dotfiles-parrot](https://github.com/M1gu3l4ngel/dotfiles-parrot)**. Si cambias la
paleta o el prompt en un repo, actualiza el otro para mantenerlos en sintonía.

## Recargar configuraciones

- Perfil de PowerShell: `. $PROFILE` (sin reabrir la terminal).
- Windows Terminal: cerrar y abrir.
- VS Code: `Developer: Reload Window` desde la paleta de comandos.
- Git Bash: `exec bash` en esa terminal.
