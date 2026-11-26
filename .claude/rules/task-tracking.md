---
description: docs/tasks.md y docs/backlog.md solo contienen trabajo pendiente y son la fuente del panel de tareas. Aplica al tocarlos.
paths: ["docs/tasks.md", "docs/backlog.md", ".claude/panel.json"]
---

# Tareas: `docs/tasks.md` solo contiene lo que falta

## La regla permanente

Una tarea completada se **borra**: no se marca, no se mueve a otra sección y no se
sustituye por un resumen de lo hecho. Lo hecho vive en git, con su diff al lado.

## Formato

Lo describe `50-claude/panel/README.md` (fases, bloques, `**Plataforma:**`,
`**Prioridad:**`, `**Requiere:**`, `**Estado:** en curso` y `# Por probar`). Las
plataformas y los dispositivos válidos son los de `.claude/panel.json`.
`.\tools\check.ps1` falla si el formato no se cumple.

- Fases `# Fase N — nombre` en el orden en que se trabajan; dentro, los bloques
  `##` de P0 a Mejora. Un bloque nuevo entra en la fase que le toca por sus
  dependencias, no al final.
- Cada bloque nombra en «Requiere» los bloques que necesita antes, o «nada». No
  se empieza un bloque con un requisito abierto.
- `**Estado:** en curso` en un solo bloque: el que se está trabajando ahora.
- Al cerrar un bloque, lo que el usuario debe comprobar entra en `# Por probar`,
  una casilla por comprobación, con `[Esta PC]` o `[PC nueva]` delante si solo
  vale en una. Sale cuando el usuario dice que lo probó, nunca antes.
- Lo diferido va en `docs/tasks.md`, fuera del orden de las fases: `# Lo hace
  el dueño`, `# Aplazado` (cada casilla con su porqué, el archivo y, tras una
  raya, el evento que la dispara) y `# Bloqueado por terceros` (se re-verifica,
  no se decide).
- `docs/backlog.md` (bloques `###`) solo para mejoras de baja prioridad sin
  evento que las dispare; normalmente queda vacío.

## Cómo se escribe una tarea

Específica, accionable, corta y comprensible sin abrir otro documento. Una tarea,
un trabajo: dos cosas en la misma línea no se pueden cerrar por separado. Nada
inventado al reorganizar, y nada de datos personales ni nombres de otros
proyectos: el repo es público.

## El panel

Es una vista de estos dos archivos: tras cambiarlos, `node ~/.claude/panel/generate.mjs`
y se republica `.claude/artifacts/project-board.html`. La página nunca se edita a
mano.
