# Estándar de documentación

Qué documentos lleva cualquier repo mío y cómo se escribe cada uno, para que todos se
lean como una familia. Se aplica al crear un repo y al auditar uno que ya existe. Las
plantillas, en inglés y listas para rellenar, están en
`~/.claude/skills/new-repo/templates/`: se copian a la raíz del repo, y `templates/github/`
a `.github/`. Todo `<placeholder>` se rellena o se quita; ninguno llega a un commit.

Si la organización tiene receta propia en su cerebro (`40-engineering/`), manda la
suya en lo que diga; lo demás sale de aquí. Antes de cerrar, se compara el resultado
con otro repo del mismo dueño, no de memoria.

## 1. Qué archivos lleva según su tipo

| Archivo | Personal (privado, una persona) | Compartido (privado, varias) | Público |
|---|---|---|---|
| `README.md` | Sí | Sí | Sí |
| `CHANGELOG.md` | Sí | Sí | Sí |
| `CONTRIBUTING.md` | No | Sí | Sí |
| `.github/pull_request_template.md` | No | Sí | Sí |
| `CODE_OF_CONDUCT.md` | No | No | Sí |
| `SECURITY.md` | No | No | Sí |
| `.github/ISSUE_TEMPLATE/` (`bug_report.yml`, `feature_request.yml`, `config.yml`) | No | No | Sí |
| `LICENSE` | La que tendría al publicarse | La que tendría al publicarse | Sí |
| `NOTICE` | Con Apache-2.0 | Con Apache-2.0 | Con Apache-2.0 |

Lo comprueba `node ~/.claude/tools/check-docs.mjs . --community personal|shared|public`,
en el check local y en el CI. Todos los documentos van solo en inglés (regla global).

## 2. Licencia, sin preguntar lo que se puede decidir

| Caso | Licencia |
|---|---|
| Producto, plantilla, o algo con nombre y logo que proteger | Apache-2.0, con `NOTICE`: copyright y que el nombre y el logo no se licencian |
| Configuración o herramienta personal pequeña (dotfiles, scripts) | MIT |
| Código de un empleador o cliente | Ninguna, y privado: el código es suyo |

Solo se pregunta si no está claro de quién es el código. El año y el titular salen de
la cuenta u organización dueña, nunca de un correo.

## 3. README

Cabecera, igual en todos (receta del `SKILL.md`, punto 3): logo en
`<picture>`, sin título `#`, descripción centrada en dos líneas, fila de enlaces en el
orden de las secciones, badges y `---`.

Cuerpo, de lo que es a cómo se usa; las secciones `##` que apliquen, en este orden y
con estos nombres (lo demás va como `###` dentro de la que le toca):

| Sección | Cuándo |
|---|---|
| (introducción sin título, y captura si es visual) | Siempre |
| Features | Producto o herramienta |
| Structure | Tabla de carpetas |
| How it works | Diagrama si hay más de dos piezas que se relacionan |
| Getting started | Siempre: requisitos en Windows, macOS y Linux (o el sistema al que va), instalación y cómo comprobarla |
| Usage | Si se usa tras instalarlo: tareas del día a día, actualizar, desinstalar |
| Troubleshooting | Tabla síntoma, causa, arreglo |
| Documentation | Si hay `docs/` |
| Contributing | Compartido o público |
| Security | Público |
| License | Siempre, la última |

Un `##` que no está en la tabla se justifica (una plantilla tiene «Update a brain»):
lo normal es un `###` dentro de Getting started o Usage. El final (Documentation,
Contributing, Security, License) no cambia nunca de orden, y cada uno es una o dos
frases que enlazan a su archivo. La fila de enlaces de la cabecera nombra las
secciones con estos mismos nombres.

## 4. CONTRIBUTING

1. `# Contributing` y una frase: gracias, y qué es este repo.
2. **Before you start:** un error o arreglo pequeño, PR directo;
   algo grande (pieza nueva, cambio de estructura), issue antes; una vulnerabilidad,
   `SECURITY.md`; la conducta, `CODE_OF_CONDUCT.md` (si es público).
3. **Set up:** requisitos (enlazando al README), los comandos para
   instalar y los checks, que son los mismos del CI, con carpeta y privilegios.
4. **What a change has to keep:** las
   invariantes del repo, en negrita y una línea cada una (datos, documentos y
   código en inglés, tests).
5. **Commits and pull requests:** Conventional Commits, un
   cambio por PR con su plantilla, la línea del CHANGELOG y qué tiene que pasar el CI.
6. **License:** la contribución se licencia como el repo.

## 5. SECURITY

1. **Supported versions:** cuál recibe arreglos (la última
   versión o el último commit de `main`).
2. **Report a vulnerability:** nunca en un issue
   público. Por el reporte privado de GitHub (Security → Report a vulnerability),
   activado con `gh api -X PUT repos/<owner>/<repo>/private-vulnerability-reporting`
   en el mismo paso que el repo se publica; y el correo de soporte de la organización,
   si tiene. Qué incluir, qué respuesta se recibe y el crédito.
3. **Scope:** dentro (lo que el repo ejecuta o publica) y fuera (las
   herramientas de terceros, que van a sus proyectos).

## 6. CODE_OF_CONDUCT

Resumen del Contributor Covenant 2.1, con el enlace oficial: **What we expect**, **What is not accepted**, **Report a problem**,
**Consequences**. El contacto: el correo de soporte de la organización, o en un repo
personal el contacto del perfil de GitHub del mantenedor.

## 7. CHANGELOG

[Keep a Changelog](https://keepachangelog.com/): `## [Unreleased]` arriba,
versiones con fecha, grupos Added, Changed, Deprecated, Removed, Fixed, Security y los
enlaces de comparación al final. Una línea por cambio que alguien nota, diciendo qué
cambia para él.

## 8. Plantillas de GitHub

- **Pull request:** «What it changes» y una lista de comprobación con los checks del
  repo, los datos personales y el CHANGELOG.
- **Issues:** formulario de error (qué pasó, pasos, versión, sistema), formulario de
  mejora (problema, propuesta, alternativas) y `config.yml` con
  `blank_issues_enabled: false` y el enlace al reporte privado.

## 9. Escritura

- Frases cortas, en presente; la segunda persona en las instrucciones. Sin relleno,
  marketing, iconos ni emojis.
- Títulos en mayúscula solo al principio (`How it works`, nunca `How It Works`), con
  los mismos nombres en todos los repos.
- Comandos que se copian y funcionan: sin prompt delante ni salida mezclada, con la
  carpeta y los privilegios dichos en el texto.
- Una información vive en un solo sitio; el resto enlaza.
- Nunca un correo personal, un usuario local ni el nombre de un cliente: el contacto
  es GitHub o el correo de la organización.
