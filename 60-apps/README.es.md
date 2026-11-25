[English](README.md) | **Español**

# 60-apps

Las aplicaciones del entorno, en dos listas con el formato de `winget export`. Este
repo es para el entorno, no para las apps personales.

## Qué hay aquí

| Archivo | Qué es | Quién lo instala |
|---|---|---|
| `essential.json` | El entorno: Git, PowerShell, Windows Terminal, VS Code, oh-my-posh, Gpg4win, Rust, Python, Docker, nvm-windows y CLI tools | `bootstrap.ps1`, en ese orden |
| `optional.json` | Otras herramientas de desarrollo, que se eligen en cada PC | Tú, cuando las quieras |

`tools/check.ps1` falla si una app está en las dos listas.

Para instalar todas las opcionales de golpe (PowerShell 7, en la raíz del repo):

```powershell
winget import 60-apps\optional.json --accept-package-agreements --accept-source-agreements
```

## Qué NO está aquí (y por qué)

- **Apps personales** (música, juegos, VPN, mensajería, ofimática…): no van en un
  repo público. Se restauran con la imagen del sistema o a mano.
- **Runtimes del sistema** (VCRedist, UI.Xaml, WindowsAppRuntime…): se instalan
  solos como dependencias.

## Mantenerlo al día

El snapshot completo de la máquina, con las apps personales, se guarda en
`winget-full.local.json`, que está en `.gitignore` y no se publica:

```powershell
winget export -o 60-apps\winget-full.local.json
```

Al instalar o quitar una herramienta de desarrollo, copia o borra su
`PackageIdentifier` en `optional.json`, o en `essential.json` si `bootstrap.ps1`
debe instalarla siempre.
