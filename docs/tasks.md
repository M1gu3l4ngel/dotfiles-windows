# Tareas pendientes — dotfiles-windows

Solo lo que falta: lo hecho se borra. Formato y reglas en
`.claude/rules/task-tracking.md`; el panel de tareas es una vista de este archivo.

# Fase 8 — Panel en el CI de cada repo

## Check del panel documentado para el CI

**Plataforma:** Claude Code.

**Prioridad:** P2.

**Requiere:** nada.

**Estado:** en curso.

- [ ] `50-claude/panel/README` explica cómo correr `check.mjs` en el CI de un repo con panel, con el paso de GitHub Actions listo para copiar

# Por probar

## Identidad de git fuera del repo

**Plataforma:** Repositorio.

- [ ] [Esta PC] Un commit nuevo sale con tu nombre y firmado («Verified» en GitHub tras el push)

## Repos con new-repo y el estándar de documentación

**Plataforma:** Claude Code.

- [ ] Al pedir un repo nuevo, Claude usa `new-repo`: pregunta dueño y visibilidad juntos y confirma antes de `gh repo create`
- [ ] El repo nace con descripción, topics, licencia, `CLAUDE.md`, formato, CI y los archivos de su tipo copiados de `templates/`, sin `<placeholder>` sin rellenar
- [ ] En un repo de una organización con cerebro, lo registra en su catálogo
- [ ] En un repo existente, Claude avisa como hallazgo cada archivo que falta o sección fuera de orden

## Comportamiento de Claude en una sesión nueva

**Plataforma:** Claude Code.

- [ ] Claude pone el trabajo en la carpeta de trabajo de `entorno.md` y dice con qué privilegios corre cada comando que te pide
- [ ] En este repo, Claude escribe en inglés los comentarios nuevos y dice al empezar si el panel está al día

---

# Lo hace el dueño

- [ ] Activar el reporte privado de vulnerabilidades que promete `SECURITY.md` (hoy está apagado), en PowerShell como usuario normal: `gh api -X PUT repos/M1gu3l4ngel/dotfiles-windows/private-vulnerability-reporting`
