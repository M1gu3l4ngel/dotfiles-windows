# apps — snapshot de aplicaciones (referencia)

Esta carpeta guarda **qué aplicaciones hay instaladas**, como referencia. **No se
auto-instalan**: este repo es para el *entorno*, no para las apps personales.

## Qué hay aquí

- **`winget-dev.json`** — snapshot **público** con solo las apps de **entorno y
  desarrollo**. Es seguro de publicar. Para reinstalarlas de forma selectiva en
  una máquina nueva:

  ```powershell
  winget import apps\winget-dev.json --accept-package-agreements --accept-source-agreements
  ```

- **`winget-full.local.json`** — snapshot **completo** de la máquina (incluye las
  apps personales). Está **gitignored** (`*.local.json`): es tu registro privado,
  **no se publica**. Para regenerarlo:

  ```powershell
  winget export -o apps\winget-full.local.json
  ```

## Qué NO está aquí (y por qué)

- **El set esencial ya lo instala `bootstrap.ps1`** (Git, PowerShell, Windows
  Terminal, VS Code, oh-my-posh, GnuPG, Rust, Python, Docker, WSL y CLI tools).
  `winget-dev.json` es el registro de las demás herramientas de dev; el bootstrap
  y este snapshot se complementan, no se pisan.
- **Apps personales** (Spotify, Steam, juegos, VPN, Telegram, Teams, Office…): no
  van en un repo público. Se restauran con la **imagen del sistema** (capa 4 de
  la estrategia de backup) o a mano.
- **Runtimes del sistema** (VCRedist, UI.Xaml, WindowsAppRuntime…): se instalan
  solos como dependencias; no tiene sentido listarlos.

## Mantenerlo al día

Cuando instales o quites apps de desarrollo, regenera el completo y vuelve a curar
el público (añadiendo/quitando IDs en `winget-dev.json`):

```powershell
winget export -o apps\winget-full.local.json
```
