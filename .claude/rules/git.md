# Git

## Commits: un commit firmado por cambio verificado

- Al cerrar cada cambio verificado (`.\tools\check.ps1` en verde y la prueba
  real del cambio), Claude hace el commit sin preguntar: `git add` de sus
  archivos por ruta (nunca `-A` ni `.`) y `git commit` firmado. El cierre dice
  el hash.
- **Un cambio, un commit.** Dos cambios independientes van en dos commits, para
  que cada uno se pueda revisar y revertir solo.
- **Push nunca, salvo que el usuario lo pida**: cada push gasta minutos de
  Actions. Nunca `--force` ni operaciones que reescriben historia
  (`filter-repo`, `rebase`, `reset`): se avisa y se entrega el comando.
- Si la firma falla (clave GPG caducada en el agente), se para y se pide al
  usuario que la desbloquee. Nunca `--no-gpg-sign`.

## Formato

Conventional Commits: título de 72 caracteres como máximo, línea en blanco y un
cuerpo con un guion por cambio concreto (sin cuerpo solo si el título lo dice
todo).

```
type(scope): resumen en español

- Qué cambió, en concreto.
- Otro cambio del mismo commit.
```

- `type` en inglés: `feat`, `fix`, `docs`, `style`, `refactor`, `chore`, `ci`.
- `scope` opcional: el componente afectado (`install`, `bootstrap`, `vscode`...).
- Texto en español. Dice qué cambió en el repo, sin nombres del plan de trabajo
  ("tanda", "bloque", "fase") ni trailers de atribución.

## Identidad y firma

- `user.email` = el **noreply** de GitHub, no el correo personal (queda público
  en cada commit).
- Commits y tags firmados con GPG (`commit.gpgsign`, `tag.gpgsign`). El setup
  completo está en `docs/gpg-signing.es.md`.

## `.gitconfig`

No se versiona en este repo: acumula entradas `safe.directory` por máquina y
revela rutas de proyectos. Se configura una vez (ver README).
