[English](CONTRIBUTING.md) | **Español**

# Contribuir

Gracias por ayudar. Es un repo personal, pero sigue un flujo estándar para mantenerlo limpio y
reproducible en cualquier PC con Windows 11.

## Antes de empezar

- **Un error o un arreglo pequeño:** abre un pull request directamente, o un issue con el
  [formulario de error](https://github.com/M1gu3l4ngel/dotfiles-windows/issues/new/choose).
- **Una app nueva, una carpeta nueva o un cambio en lo que instala `bootstrap.ps1`:** abre antes
  un issue y describe el problema que resuelve. Cambia cada PC que hace pull del repo, así que se
  acuerda antes de escribirse.
- **Una vulnerabilidad:** nunca en un issue público; sigue [`SECURITY.es.md`](SECURITY.es.md).
- **Conducta:** todo el que participa sigue el [código de conducta](CODE_OF_CONDUCT.es.md).

## Preparar

Necesita Windows 11, PowerShell 7, git y Node.js 24; el [README](README.es.md#requisitos-previos)
explica cómo conseguirlos. Clona el repo, crea una rama desde `main` y corre las comprobaciones
desde su raíz, en PowerShell 7 como usuario normal. Son las mismas que corre el CI:

```powershell
.\tools\check.ps1
```

Para ver qué cambiaría el instalador en tu PC sin cambiar nada:

```powershell
.\bootstrap.ps1 -DryRun
.\install.ps1 -Check
```

## Qué tiene que mantener un cambio

- **Nada personal ni de una empresa:** ni usuario, ni email, ni IP, ni hostname, ni fingerprint
  de clave, ni endpoint interno. Revisa `30-vscode/vscode/settings.json` antes de commitear: las
  extensiones escriben keys ahí. Detalle en `.claude/rules/security.md`.
- **Descargas verificadas:** las apps vienen de winget; lo demás se descarga en versión fija y
  se verifica con SHA-256.
- **Scripts idempotentes:** cada paso comprueba si ya está hecho, así que un script puede volver
  a correr sin romper nada.
- **Documentos en pareja:** `X.md` en inglés y `X.es.md` en español, con las mismas secciones,
  bloques de código idénticos y el selector de idioma en la línea 1. `.\tools\check.ps1`
  (`50-claude/tools/check-docs.mjs`) lo comprueba, enlaces y anclas incluidos. Donde un flujo se
  entiende mejor dibujado, un diagrama Mermaid, idéntico en los dos idiomas, con etiquetas en
  inglés.
- **Inglés** en los comentarios del código, la salida de los scripts, los mensajes de los hooks
  y los nombres de los tests, según
  [docs/contributing/comments.es.md](docs/contributing/comments.es.md). Las reglas de
  `.claude/rules/` y las listas de tareas (`docs/tasks.md`, `docs/backlog.md`) van solo en español.
- **Documentación sobria:** sin emojis, con comandos que se copian y funcionan tal cual.

Las convenciones están en `.claude/rules/`. Son Markdown normal: sirven igual para personas y
para Claude Code, que las carga automáticamente.

| Archivo | Qué define |
|---|---|
| `security.md` | Datos personales y de empresa, secretos, descargas verificadas |
| `git.md` | Commits, formato, firma, email noreply |
| `file-edits.md` | Editar con Edit/Write, archivos protegidos |
| `powershell.md` | Convenciones de PowerShell |
| `documentation.md` | Estilo de la documentación y la regla de los dos idiomas |
| `environment.md` | Discos, Developer Mode, symlinks, WSL |
| `task-tracking.md` | `docs/tasks.md` y `docs/backlog.md` (en español): lo que falta por hacer, y el panel de tareas que se genera de ellos |

## Commits y pull requests

Los commits siguen [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/): un
título de 72 caracteres como máximo, una línea en blanco y un cuerpo con un guion por cambio
concreto (sin cuerpo solo si el título lo dice todo), en inglés y en imperativo:

```
type(scope): <summary>

- <change>
- <change>
```

- `type` en inglés: `feat`, `fix`, `docs`, `style`, `refactor`, `chore`, `ci`.
- `scope` opcional: el componente afectado (`install`, `bootstrap`, `vscode`...).
- **Un commit por cambio verificado**: dos cambios independientes van en dos commits, para que
  cada uno se pueda revisar y revertir solo.
- Los archivos se añaden por ruta, nunca con `git add -A` ni `git add .`.
- El repo es público y cada commit publica el email del autor: usa el **email noreply** de
  GitHub y **firma los commits con GPG**, como explica
  [docs/gpg-signing.es.md](docs/gpg-signing.es.md).

Un pull request hace una sola cosa y rellena su plantilla. Un cambio que se nota añade su línea
en «Sin publicar» de [CHANGELOG.es.md](CHANGELOG.es.md) y en «Unreleased» de su pareja en
inglés. El CI tiene que pasar: las mismas comprobaciones que `.\tools\check.ps1`, más el escaneo
de secretos.

## Licencia

Al contribuir, aceptas que tu contribución se licencia bajo [MIT](LICENSE), como el resto del
repo.
