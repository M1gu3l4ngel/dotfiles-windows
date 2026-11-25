[English](README.md) | **Español**

# 10-shell

Los shells y su prompt: PowerShell y Git Bash cargan el mismo tema de oh-my-posh,
así que el prompt se ve igual en los dos.

| Ruta | Enlazado en | Qué es |
|---|---|---|
| `powershell/Microsoft.PowerShell_profile.ps1` | `Documentos\PowerShell\` y `Documentos\WindowsPowerShell\` | Perfil de PowerShell 7 y de Windows PowerShell (el mismo archivo) |
| `bash/.bashrc` | `~/.bashrc` | Shell interactivo de Git Bash: carga el prompt |
| `bash/.bash_profile` | `~/.bash_profile` | Git Bash abre como login shell, que no lee `.bashrc`: este archivo lo carga |
| `oh-my-posh/capr4n.omp.json` | — (se lee en su sitio) | Tema del prompt, compartido con [dotfiles-parrot](https://github.com/M1gu3l4ngel/dotfiles-parrot) |

`install.ps1` crea los enlaces. El perfil y `.bashrc` encuentran el tema a través
de su propio enlace, así que el repo funciona clonado en cualquier carpeta.

La terminal integrada de VS Code no carga perfil a propósito: cuesta casi un
segundo en cada terminal (ver `lib/links.ps1`).

## Recargar

- PowerShell: `. $PROFILE`
- Git Bash: `exec bash`
