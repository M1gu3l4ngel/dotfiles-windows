---
name: new-repo
description: Crea un repositorio nuevo bien armado (GitHub con descripción y topics, licencia, README bilingüe con diagrama, CHANGELOG, CLAUDE.md, formato, CI y registro en el cerebro de la organización) o completa uno existente al que le faltan piezas. Úsalo al crear un repo (git init, gh repo create) o cuando la regla repo-conventions detecte que falta algo.
---

# new-repo

Lo universal de cualquier repo mío, sea personal, de una organización propia o de
un empleador. Lo específico de una empresa (nombre de la organización, web, cómo
se nombran sus repos, plantillas) **no está aquí**: vive en su cerebro, y lo que
diga el cerebro manda sobre lo de aquí.

Ya aplican y no se repiten: documentación bilingüe, editar con Edit/Write,
commits y push, disco `D:` y formato (`~/.claude/CLAUDE.md`).

## 1. Antes de tocar nada

- **Datos**: lo que no se deduzca del contexto, en una sola pregunta agrupada:
  dueño (personal, organización propia, empleador o cliente), visibilidad, qué
  es en una frase, stack y web.
- **Cerebro**: si el repo es de una organización, busca su repo `brain` hermano
  (`D:\Dev\projects\<organización>\brain`) y lee su README, su `CLAUDE.md` y lo
  que su `AGENTS.md` señale para repos (en los cerebros de `brain-template`,
  `40-engineering/`): nombre de la organización en GitHub, convención de nombres,
  web, plantillas, rama de trabajo, receta del README y dónde está su catálogo.
- **Carpeta**: `D:\Dev\projects\<organización o personal>\<repo>`.
- **Publicar es confirmar**: crear el repo remoto lo publica. Confirma nombre,
  dueño y visibilidad antes de `gh repo create`.

## 2. Licencia, elegida a propósito

| Caso | Licencia | Visibilidad |
|---|---|---|
| Personal u organización propia, público | MIT (lo simple) o Apache-2.0 (si importan las patentes o proteger el nombre y el logo; con `NOTICE` para el copyright) | Público |
| De un empleador o cliente | Ninguna: el código es suyo | Privado |
| Privado propio que podría publicarse | La que tendría al publicarse | Privado |

Si no está claro de quién es el código, se pregunta: no se adivina.

## 3. Archivos base (cada uno solo si falta)

| Archivo | Qué lleva |
|---|---|
| `README.md` + `README.es.md` | Cabecera: selector en la línea 1; si hay marca, el logo en `<picture>` con su versión clara y oscura (una sola desaparece en uno de los temas), sin título `#` que repita el nombre debajo; descripción centrada en dos líneas; fila de enlaces a las secciones en su orden; badges de tecnologías y licencia, y de CI solo si es público. Después: cómo empezar, con la instalación de cada requisito en Windows (winget), macOS (Homebrew) y Linux (instalador oficial o enlace a su guía), versión de Node en `engines.node` como fuente única (exacta si se despliega, `>=` si lo instalan otros; regla `repo-conventions`) y comandos copiables y probados; si es una herramienta o plantilla, primeros pasos tras instalarla; estructura (tabla de carpetas); diagrama si hay más de dos piezas que se relacionan; licencia. Si la organización tiene receta propia, manda la suya, y la cabecera se compara con la de otro de sus repos antes de cerrar |
| `CHANGELOG.md` + `.es.md` | Keep a Changelog con `## [Unreleased]` / `## [Sin publicar]` |
| `CONTRIBUTING.md` + `.es.md` | Solo si es compartido (público o más de una persona): flujo, checks, commits |
| `.editorconfig`, `.prettierrc.json`, `.prettierignore` | Propios del repo, aunque copien el estilo global: con CI no se depende de `~` |
| `.gitattributes` | `* text=auto eol=lf` y los binarios marcados |
| `.gitignore` | El del stack, más `.env`, claves y `*.local.*` |
| `CLAUDE.md` (español) | Qué es, stack, tabla de comandos, convenciones y enlace a `docs/` |
| `LICENSE` | La de la tabla de arriba, si lleva |

Diagramas: Mermaid `flowchart`, etiquetas entre comillas, `<br/>` y `·` para
separar, sin colores propios (se ve en tema claro y oscuro). Es un bloque de
código: idéntico en las dos versiones, con etiquetas en inglés.

## 4. CI mínimo

- `.github/workflows/ci.yml`: lint, formato (`prettier --check`), tests y el
  check de docs bilingües. Acciones fijadas por SHA de commit,
  `permissions: contents: read`, `concurrency` con `cancel-in-progress` y
  filtros de `paths` para no gastar minutos en lo que no los necesita. Si otros
  lo instalan o lo corren en su máquina, matriz con `windows-latest` y
  `macos-latest` además de Linux, en `bash`.
- Check bilingüe: el de la organización si su cerebro o su plantilla lo trae;
  si no, copia `tools/check-docs.ps1` de dotfiles-windows (el repo al que apunta
  el enlace `~/.claude/CLAUDE.md`) y córrelo con `pwsh` en el CI.
- `.github/dependabot.yml` mensual para `github-actions`.
- Ramas: `main` por defecto y el trabajo en la rama que diga el proyecto (su
  cerebro o su `CLAUDE.md`). Push nunca a `main`. La protección de `main` se
  propone; la activa el dueño.

## 5. GitHub

Descripción en inglés, una frase: qué es y qué trae. De 6 a 10 topics en
minúsculas con guiones, de tecnología y de propósito. La web, si la tiene.

```bash
gh repo create <owner>/<repo> --private --source .
gh repo edit <owner>/<repo> --description "<one sentence>" --homepage "<url>" --add-topic <topic>,<topic>
gh repo view <owner>/<repo> --json description,repositoryTopics,homepageUrl
```

`--public` en lugar de `--private` según la tabla de licencia. El primer push lo
hace el usuario o lo pide.

## 6. Cerebro

Si la organización tiene cerebro, registra el repo en su catálogo, en el archivo
y el formato que ya usa, con su propio commit en el cerebro.

## 7. Cierre

- Corre el check de docs y el formato antes del commit inicial.
- Si viene trabajo de varios bloques: `node ~/.claude/panel/init.mjs`.
- Informa de lo creado, de la salida de `gh repo view` y de lo que queda (push,
  protección de `main`).

## Repo que ya existe

El mismo recorrido como auditoría: cada pieza que falta es un hallazgo, una línea
con archivo, qué falta y qué se recomienda. Lo pequeño (un `.gitattributes`, el
selector de idioma) se crea en el mismo cambio y se dice; lo grande (CI,
licencia, visibilidad, el catálogo del cerebro) se propone y decide el usuario.
