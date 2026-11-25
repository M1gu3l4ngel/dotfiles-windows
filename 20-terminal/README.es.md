[English](README.md) | **Español**

# 20-terminal

La configuración de Windows Terminal: PowerShell 7 como perfil por defecto, el
esquema de colores Monokai Soda y la fuente CaskaydiaCove Nerd Font, que necesitan
los iconos del prompt.

| Ruta | Enlazado en | Qué es |
|---|---|---|
| `windows-terminal/settings.json` | `%LOCALAPPDATA%\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json` | Perfiles, esquema de colores, fuente y atajos |

`install.ps1` crea el enlace. `bootstrap.ps1` instala la fuente, verificada por
SHA-256.

Windows Terminal reescribe el archivo entero (4 espacios) cada vez que se cambia
un ajuste desde su interfaz, así que `.prettierignore` lo deja fuera: formatearlo
convertiría cada cambio en un diff enorme.

## Recargar

Cerrar y abrir Windows Terminal.
