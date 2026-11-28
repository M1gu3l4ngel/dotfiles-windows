---
paths:
  - "**/*.md"
---

# Documentación

Qué documentos lleva el repo, el orden de sus secciones y cómo se escriben los sigue de
`50-claude/skills/new-repo/docs-standard.md`, la guía de todos los repos, y `tools/check.ps1`
lo comprueba con `check-docs.mjs`. Lo de aquí lo completa para este repo.

Aplica a los `README`, `CONTRIBUTING`, `CHANGELOG`, `SECURITY`, `CODE_OF_CONDUCT` y
`docs/`. No a `CLAUDE.md`,
`.claude/rules/` ni a `docs/tasks.md` y `docs/backlog.md` (instrucciones y lista
de trabajo del agente, solo en español; el panel de tareas lee sus títulos en
español).

## Idioma: la documentación va solo en inglés

- Un documento, un idioma: `X.md` en inglés, sin copia `X.es.md` ni selector de
  idioma. Nombres de archivo en inglés.
- Placeholders en inglés neutro (`<user>`, `<your-noreply>`); los textos que
  muestra el programa (mensajes, salidas) se citan tal cual.
- `tools/check.ps1` (`50-claude/tools/check-docs.mjs`) falla si aparece una
  copia `.es.md` o un selector, o si hay enlaces o anclas rotos.
- En español solo la capa del agente: `CLAUDE.md`, `.claude/rules/`, las reglas
  y el skill de `50-claude/`, `docs/tasks.md` y `docs/backlog.md`.
- En inglés: comentarios de código, salida de los scripts, `reason` de los hooks
  y nombres de los tests (`docs/contributing/comments.md`); los mensajes de
  commit también (`git.md`).

## Estilo

- **Sin iconos ni emojis.** Texto sobrio.
- Lenguaje directo y simple. Sin relleno ni marketing.
- Términos técnicos, comandos y rutas tal cual.
- Escaneable: secciones cortas, títulos claros, lo importante arriba.
- El lector debe poder reproducir el setup sin leerlo todo.

## Instrucciones

- Pasos numerados, en el orden exacto de ejecución, cada uno autocontenido.
- Cada bloque de comandos se copia y funciona tal cual: sin `PS>` delante, sin
  salida mezclada, sin placeholders sin explicar.
- Indicar en cada paso si requiere administrador y desde qué shell se ejecuta.
- Nunca documentar de memoria: ejecutar cada comando antes de escribirlo.

## Consistencia

- Mismos nombres en todo el repo: rutas reales, nombres de script reales
  (`bootstrap.ps1`, `install.ps1`).
- Una información vive en un solo sitio; el resto enlaza. Si algo cambia en el
  código, actualizar su documentación en el mismo commit.
- Markdown: bloques de código con el lenguaje indicado (`powershell`, `bash`,
  `json`, `ini`).

## Diagramas

- Donde un flujo o una relación se entiende mejor dibujado, un diagrama
  **Mermaid** (bloque con lenguaje `mermaid`, GitHub lo dibuja): `flowchart`, etiquetas entre
  comillas, `<br/>` y `·` para separar, sin colores propios (se ve en tema
  claro y oscuro).
- Es un bloque de código: idéntico en las dos versiones, con etiquetas en
  inglés. El texto de alrededor lo explica en cada idioma.
- Pocos y con propósito: un diagrama que repite una lista sobra.
