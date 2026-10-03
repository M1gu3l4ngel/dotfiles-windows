# Seguridad

El repo es público en GitHub. Todo lo que entra en un commit queda publicado
para siempre en el historial.

## Datos personales y de empresa

- Nunca incluir datos que identifiquen a una persona o máquina: usuario local,
  correo personal, **correo corporativo** (`@REDACTED.com`), IPs reales,
  hostnames, IDs o tenants de Azure, endpoints de Fabric/OneLake, fingerprints o
  IDs de claves, nombres de clientes.
- Usar placeholders (`<TU_FINGERPRINT>`, `<usuario>`) o valores en tiempo de
  ejecución (`$env:USERPROFILE`, `[Environment]::GetFolderPath(...)`).
- Los commits se firman con GPG y usan el **email noreply** de GitHub, no el
  personal. Ver `docs/gpg-signing.es.md`.

## Ojo con vscode/settings.json

Varias extensiones (mssql, generadores de commits, etc.) escriben conexiones y
**API keys dentro de `vscode/settings.json`**, que sí se versiona. Antes de
commitear, revisar ese archivo en busca de `mssql.connections`, `*.apiKey`,
tokens y correos. Ya se filtraron datos de la empresa y una API key por esto.

## Descargas externas

- Las apps van por **winget** (verifica sus descargas). Lo que se descarga
  directo (fuentes Nerd) se fija por versión y se verifica con **SHA-256** antes
  de instalar; ver la tabla `$NerdFonts` en `bootstrap.ps1`.
- Nunca `irm <url> | iex` de un script remoto sin revisarlo ni verificarlo.
- En GitHub Actions, fijar las acciones por **SHA de commit**, no por etiqueta.

## Verificación

- `gitleaks` corre en el CI sobre todo el historial. Revisar también el `diff` a
  mano antes de proponer un commit, no solo confiar en la herramienta.

## .gitignore (deben quedar fuera)

`mcp.json` (tokens de MCP), `*.local.json` (snapshot de apps con datos
personales), `.env`, claves (`*.key`, `*.pem`, `*_ed25519`), `secrets/` y los
`.pre-dotfiles.bak`. `CLAUDE.md` y `.claude/rules/` sí se versionan: por eso
tampoco pueden contener datos personales.
