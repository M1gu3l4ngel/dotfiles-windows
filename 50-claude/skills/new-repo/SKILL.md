---
name: new-repo
description: Crea un repositorio nuevo bien armado (GitHub con descripción y topics, licencia, README en inglés con diagrama, CHANGELOG, CLAUDE.md, formato, CI y registro en el cerebro de la organización) o completa uno existente al que le faltan piezas. Úsalo al crear un repo (git init, gh repo create) o cuando la regla repo-conventions detecte que falta algo.
---

# new-repo

Lo universal de cualquier repo mío, sea personal, de una organización propia o de
un empleador. Lo específico de una empresa (nombre de la organización, web, cómo
se nombran sus repos, plantillas) **no está aquí**: vive en su cerebro, y lo que
diga el cerebro manda sobre lo de aquí.

Ya aplican y no se repiten: repo solo en inglés, editar con Edit/Write,
commits y push, carpeta de trabajo y formato (`~/.claude/CLAUDE.md`).

## 1. Antes de tocar nada

- **Datos**: lo que no se deduzca del contexto, en una sola pregunta agrupada:
  dueño (personal, organización propia, empleador o cliente), visibilidad, qué
  es en una frase, stack y web.
- **Cerebro**: si el repo es de una organización, busca su repo `brain` hermano
  (`<trabajo>/projects/<organización>/brain`) y lee su README, su `CLAUDE.md` y lo
  que su `AGENTS.md` señale para repos (en los cerebros de `brain-template`,
  `40-engineering/`): nombre de la organización en GitHub, convención de nombres,
  web, plantillas, rama de trabajo, receta del README y dónde está su catálogo.
- **Carpeta**: `<trabajo>/projects/<organización o personal>/<repo>`, con
  `<trabajo>` la carpeta de trabajo de `~/.claude/entorno.md`.
- **Publicar es confirmar**: crear el repo remoto lo publica. Confirma nombre,
  dueño y visibilidad antes de `gh repo create`.

## 2. Licencia y documentos: `docs-standard.md`

La licencia, qué documentos lleva el repo según sea personal, compartido o público
(README, CHANGELOG, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, NOTICE y las plantillas
de `.github/`), el orden de sus secciones y cómo se escriben están en
[`docs-standard.md`](docs-standard.md), con sus plantillas en `templates/`. Se sigue
al pie de la letra; si no está claro de quién es el código, se pregunta.

## 3. Archivos base (cada uno solo si falta)

| Archivo | Qué lleva |
|---|---|
| `README.md` | Cabecera: si hay marca, el logo en `<picture>` con su versión clara y oscura (una sola desaparece en uno de los temas), sin título `#` que repita el nombre debajo; descripción centrada en dos líneas; fila de enlaces a las secciones en su orden; badges de tecnologías y licencia, y de CI solo si es público. Cuerpo en el orden de `docs-standard.md`, con la versión de Node en `engines.node` como fuente única (regla `repo-conventions`) y comandos copiables y probados. Si la organización tiene receta propia, manda la suya, y la cabecera se compara con la de otro de sus repos antes de cerrar |
| Documentos de comunidad | Los de su tipo en `docs-standard.md`, desde `templates/` |
| `.editorconfig`, `.prettierrc.json`, `.prettierignore` | Propios del repo, aunque copien el estilo global: con CI no se depende de `~` |
| `.gitattributes` | `* text=auto eol=lf` y los binarios marcados |
| `.gitignore` | El del stack, más `.env`, claves y `*.local.*` |
| `CLAUDE.md` (español) | Qué es, stack, tabla de comandos, convenciones y enlace a `docs/` |
| `LICENSE` | La de `docs-standard.md`, si lleva |

Diagramas: Mermaid `flowchart`, etiquetas entre comillas, `<br/>` y `·` para
separar, sin colores propios (se ve en tema claro y oscuro). Es un bloque de
código: idéntico en las dos versiones, con etiquetas en inglés.

## 4. CI mínimo

- `.github/workflows/ci.yml`: lint, formato (`prettier --check`), tests y el
  check de docs. Acciones fijadas por SHA de commit,
  `permissions: contents: read`, `concurrency` con `cancel-in-progress` y
  filtros de `paths` para no gastar minutos en lo que no los necesita. Si otros
  lo instalan o lo corren en su máquina, matriz con `windows-latest` y
  `macos-latest` además de Linux, en `bash`.
- Check de docs: el de la organización si su cerebro o su plantilla lo trae;
  si no, `node ~/.claude/tools/check-docs.mjs . --community <tipo>` (de dotfiles-windows, con
  `--exclude` para lo que el repo tenga solo en español). En el CI, un segundo
  `actions/checkout` de dotfiles-windows fijado por SHA y el mismo comando con su
  ruta; con él, `check-comments.mjs`.
- `.github/dependabot.yml` mensual para `github-actions`.
- Ramas: `main` por defecto y el trabajo en la rama que diga el proyecto (su
  cerebro o su `CLAUDE.md`). Push nunca a `main`, salvo en un repo de solo `main`.

## 5. GitHub

Descripción en inglés, una frase: qué es y qué trae. De 6 a 10 topics en
minúsculas con guiones, de tecnología y de propósito. La web, si la tiene.

```bash
gh repo create <owner>/<repo> --private --source .
gh repo edit <owner>/<repo> --description "<one sentence>" --homepage "<url>" --add-topic <topic>,<topic>
gh api -X PUT repos/<owner>/<repo>/private-vulnerability-reporting
gh repo view <owner>/<repo> --json description,repositoryTopics,homepageUrl
```

`--public` en lugar de `--private` según `docs-standard.md`. El reporte privado de
vulnerabilidades (la última línea) solo en un repo público: es lo que promete su
`SECURITY.md`. El primer push lo hace el usuario o lo pide.

Protección de `main`, en el mismo paso: nadie la borra ni la reescribe con un push
forzado. Un repo de solo `main` lleva esta y nada más (pedir PR le cortaría su
flujo); uno con rama de trabajo y CI usa además la de su proyecto, con PR y checks
obligatorios (en Creaskar, `.github/rulesets/protect-main-staging.json`).

```bash
gh api -X POST repos/<owner>/<repo>/rulesets --input ~/.claude/skills/new-repo/rulesets/protect-main.json
gh api repos/<owner>/<repo>/rulesets --jq '.[].name'
```

## 6. Cerebro

Si la organización tiene cerebro, registra el repo en su catálogo, en el archivo
y el formato que ya usa, con su propio commit en el cerebro.

## 7. Cierre

- Corre el check de docs y el formato antes del commit inicial.
- Si viene trabajo de varios bloques: `node ~/.claude/panel/init.mjs`.
- Informa de lo creado, de la salida de `gh repo view` y de los rulesets, y de lo
  que queda (el push).

## Repo que ya existe

El mismo recorrido como auditoría: cada pieza que falta es un hallazgo, una línea
con archivo, qué falta y qué se recomienda. Lo pequeño (un `.gitattributes`, un
enlace roto) se crea en el mismo cambio y se dice; lo grande (CI,
licencia, visibilidad, el catálogo del cerebro) se propone y decide el usuario.
