# dotfiles-windows

Setup personal de Windows 11 (PowerShell + oh-my-posh + Windows Terminal + VS Code
+ WSL), paralelo a [dotfiles-parrot](https://github.com/M1gu3l4ngel/dotfiles-parrot).
Repo **público**.

El entorno completo se levanta con `bootstrap.ps1`; los symlinks de configuración
los crea `install.ps1`.

## Reglas

Las reglas detalladas están en `.claude/rules/` y **Claude Code las carga solas**
(auto-load; no hay que importarlas). Algunas se limitan a ciertos archivos con
frontmatter `paths:`.

- `security.md`: repo público, secretos, datos de empresa, descargas verificadas.
- `git.md`: commits (uno solo, los ejecuta el usuario), formato, firma, noreply.
- `file-edits.md`: editar con Edit/Write nunca con sed; archivos protegidos.
- `powershell.md`: convenciones de PowerShell (al tocar `.ps1`).
- `documentation.md`: estilo sobrio de la documentación (al tocar `.md`).
- `environment.md`: discos C:/D:, Developer Mode, symlinks, WSL, prompt.

Documentación oficial de Claude Code (para mantener estas reglas al día):

- Memoria / CLAUDE.md — https://code.claude.com/docs/en/memory.md
- Settings — https://code.claude.com/docs/en/settings-reference.md
- Directorio `.claude/` — https://code.claude.com/docs/en/claude-directory.md

## Comandos

| Tarea | Comando |
|---|---|
| Instalación completa del entorno | `.\bootstrap.ps1` |
| Ver qué haría sin cambiar nada | `.\bootstrap.ps1 -DryRun` |
| Solo symlinks de configuración | `.\install.ps1` |
| Comprobaciones (las mismas del CI) | `.\tools\check.ps1` |

`.\tools\check.ps1` debe pasar antes de proponer un commit.

## Recargar configuraciones

- PowerShell: `. $PROFILE` (sin reabrir la terminal).
- Windows Terminal: cerrar y abrir.
- VS Code: `Developer: Reload Window` desde la paleta de comandos.
