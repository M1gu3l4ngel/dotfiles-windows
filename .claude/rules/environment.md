# Entorno (Windows)

## Discos

- `C:` = sistema y programas. `D:` = trabajo (proyectos, cachés, globales).
- `bootstrap.ps1` detecta si existe `D:`; si no, usa `C:` (máquina de un solo
  disco). Las variables de entorno (CARGO_HOME, RUSTUP_HOME, NUGET_PACKAGES,
  PUPPETEER_CACHE_DIR, npm prefix/cache, pnpm store) apuntan a ese disco.

## Symlinks

- `install.ps1` crea symlinks con `New-Item -ItemType SymbolicLink`.
- Requiere **Developer Mode** activado (Settings → Privacy & security → For
  developers) o ejecutar como administrador. Sin eso, la creación falla; el
  script lo valida antes de tocar nada.

## Toolchain y apps

- Node vía **nvm-windows**; globales (`pnpm`, `claude`) en `<disco>\Dev\npm-global`.
- Apps del entorno por **winget** (no choco, no scoop, no instaladores manuales).
- Módulos de PowerShell: `Install-Module -Scope CurrentUser` (sin admin).
- Fuente: **CaskaydiaCove Nerd Font** (tabla `$NerdFonts`, verificada por SHA-256).
- WSL Ubuntu comparte el mismo prompt.

## Prompt compartido con Parrot

El tema `oh-my-posh/capr4n.omp.json` y la paleta de colores son **compartidos con
[dotfiles-parrot](https://github.com/M1gu3l4ngel/dotfiles-parrot)**. Si cambias la
paleta o el prompt en un repo, actualiza el otro para mantenerlos en sintonía.

## Recargar configuraciones

- Perfil de PowerShell: `. $PROFILE` (sin reabrir la terminal).
- Windows Terminal: cerrar y abrir.
- VS Code: `Developer: Reload Window` desde la paleta de comandos.
- Git Bash: `exec bash` en esa terminal.
