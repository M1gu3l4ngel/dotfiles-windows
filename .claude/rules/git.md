# Git

## Commits: el usuario los ejecuta, no Claude

- **Nunca** ejecutar `git commit` ni `git push` por iniciativa propia. En su
  lugar, entregar al usuario el comando exacto para que lo corra él, y esperar su
  OK. Lo mismo para operaciones que reescriben historia (`filter-repo`,
  `git push --force`): avisar y entregar, nunca hacerlas solo.
- **Siempre un solo commit**, aunque el cambio toque varios archivos o sea de
  varios tipos. (Preferencia explícita del usuario; anula "un commit por cambio
  lógico".)
- Recordar que el commit está firmado: le saltará el pinentry pidiendo la
  passphrase de GPG.

## Formato

Conventional Commits en una sola línea de 72 caracteres como máximo:

```
type(scope): descripción en español
```

- `type` en inglés: `feat`, `fix`, `docs`, `style`, `refactor`, `chore`, `ci`.
- `scope` opcional: el componente afectado (`install`, `bootstrap`, `vscode`...).
- Descripción en español.

## Identidad y firma

- `user.email` = el **noreply** de GitHub, no el correo personal (queda público
  en cada commit).
- Commits y tags firmados con GPG (`commit.gpgsign`, `tag.gpgsign`). El setup
  completo está en `docs/gpg-signing.es.md`.

## `.gitconfig`

No se versiona en este repo: acumula entradas `safe.directory` por máquina y
revela rutas de proyectos. Se configura una vez (ver README).
