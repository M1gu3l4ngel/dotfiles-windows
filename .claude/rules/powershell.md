---
paths:
  - "**/*.ps1"
  - "**/*.psm1"
---

# PowerShell

## Robustez

- Empezar con `#Requires -Version 5.1` y `$ErrorActionPreference = 'Stop'`.
- Idempotencia: cada paso comprueba si ya está hecho antes de actuar, para poder
  re-ejecutar el script sin romper nada.
- Antes de una acción destructiva (borrar, sobrescribir), validar primero y hacer
  **backup** (ver el patrón `.pre-dotfiles.bak` de `install.ps1`). Si una
  operación puede fallar a mitad, restaurar lo movido.
- Rutas del usuario con `$env:USERPROFILE`, `$env:LOCALAPPDATA`,
  `[Environment]::GetFolderPath(...)` — nunca hardcodear `C:\Users\<nombre>`.

## Estilo

- **Indentación con tabs** (el editor del repo usa `insertSpaces: false`).
- Funciones con nombre `Verbo-Sustantivo` (`Install-Symlink`, `Get-WorkDrive`).
- Comentarios en español que explican el *porqué*, no el *qué*.
- Mensajes de estado con `Write-Host`; los valores de retorno se devuelven con
  `return`, nunca mezclados con la salida de texto.

## Calidad

- El código debe pasar **PSScriptAnalyzer** sin avisos (lo corre `tools/check.ps1`
  y el CI). Formatear con el formateador de PowerShell antes de commitear.

## Descargas

- Lo que no venga de winget se descarga en versión fija y se verifica con
  **SHA-256** antes de usarse (ver la tabla `$NerdFonts` de `bootstrap.ps1`).
