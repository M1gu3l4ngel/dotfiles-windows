# Backlog — mejoras diferidas (baja prioridad)

Lugar para mejoras técnicas **diferidas** que no bloquean nada pero conviene ir
puliendo con el tiempo. Lo aplazado con un evento que lo dispara va en
`docs/tasks.md`, sección «Aplazado»; aquí, solo los ítems de baja prioridad o
progresivos sin evento: optimizaciones acotadas, deuda menor, "nice-to-have"
técnicos.

**Solo pendiente:** al completar un ítem se borra de aquí — lo hecho vive en git,
nunca se anota como "hecho" (misma regla que `tasks.md`).

Formato: cada bloque `###` lleva su `**Plataforma:**`, el contexto (por qué está
diferido, archivos) y lo que hay que hacer como casillas `- [ ]`. De ahí se genera
el panel, y `.\tools\check.ps1` falla si un bloque no tiene plataforma o casillas.
