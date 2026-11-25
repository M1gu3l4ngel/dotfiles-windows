[English](CONTRIBUTING.md) | **Español**

# Contribuir

Es un repo personal, pero sigue un flujo estándar para mantenerlo limpio y
reproducible.

## Flujo

1. Crea una rama desde `main`.
2. Haz los cambios siguiendo las convenciones de abajo.
3. Ejecuta las comprobaciones desde la raíz del repo. Deben pasar todas:

   ```powershell
   .\tools\check.ps1
   ```

4. Haz un commit siguiendo el formato de commits.
5. Abre un pull request. El CI ejecuta las mismas comprobaciones y marca el
   resultado en GitHub.

Si el cambio es visible para el usuario, añádelo al changelog
([CHANGELOG.es.md](CHANGELOG.es.md) y su pareja en inglés) en la sección
"Sin publicar" / "Unreleased".

## Commits

Formato [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/): un
título de 72 caracteres como máximo, una línea en blanco y un cuerpo con un
guion por cambio concreto (sin cuerpo solo si el título lo dice todo). El texto
va en inglés, en imperativo:

```
type(scope): <summary>

- <change>
- <change>
```

- `type` en inglés: `feat`, `fix`, `docs`, `style`, `refactor`, `chore`, `ci`.
- `scope` opcional: el componente afectado (`install`, `bootstrap`, `vscode`...).
- **Un commit por cambio verificado**: dos cambios independientes van en dos
  commits, para que cada uno se pueda revisar y revertir solo.
- Los archivos se añaden por ruta, nunca con `git add -A` ni `git add .`.

El repo es público y cada commit publica el email del autor: usa el **email
noreply** de GitHub y **firma los commits con GPG**. Cómo configurarlo:
[docs/gpg-signing.es.md](docs/gpg-signing.es.md).

## Documentación en dos idiomas

Toda la documentación existe en inglés (`X.md`) y en español (`X.es.md`), con
el selector de idioma en la primera línea. Al cambiar un documento, cambia
también su pareja en el mismo commit. `.\tools\check.ps1`
(`tools\check-docs.ps1`) falla si no tienen la misma estructura (secciones,
tablas, listas, enlaces), si sus bloques de código difieren (los comandos no se
traducen) o si hay enlaces o anclas rotos.

Donde un flujo se entiende mejor dibujado, va un diagrama Mermaid: es un bloque
de código, así que es idéntico en los dos idiomas, con etiquetas en inglés.

Los comentarios del código, la salida de los scripts, los mensajes de los hooks
y los nombres de los tests se escriben en inglés, según
[docs/contributing/comments.es.md](docs/contributing/comments.es.md). Las reglas
de `.claude/rules/` y las listas de tareas (`docs/tasks.md`, `docs/backlog.md`)
se escriben solo en español.

## Convenciones

Están en `.claude/rules/`. Son Markdown normal: sirven igual para personas y para
Claude Code, que las carga automáticamente.

| Archivo | Qué define |
|---|---|
| `security.md` | Datos personales y de empresa, secretos, descargas verificadas |
| `git.md` | Commits, formato, firma, email noreply |
| `file-edits.md` | Editar con Edit/Write, archivos protegidos |
| `powershell.md` | Convenciones de PowerShell |
| `documentation.md` | Estilo de la documentación y la regla de los dos idiomas |
| `environment.md` | Discos, Developer Mode, symlinks, WSL |
| `task-tracking.md` | `docs/tasks.md` y `docs/backlog.md` (en español): lo que falta por hacer, y el panel de tareas que se genera de ellos |

Lo más importante:

- Nunca incluyas datos personales ni de empresa (usuario, emails, IPs,
  fingerprints, endpoints internos). Revisa `30-vscode/vscode/settings.json` antes de
  commitear: las extensiones escriben keys ahí.
- Lo que no venga de winget se descarga en versión fija y se verifica con SHA-256.
- La documentación va sobria, sin emojis.

## Reportar problemas

Abre un issue con qué esperabas, qué pasó, versión de Windows y los pasos para
reproducirlo (con captura si es visual).
