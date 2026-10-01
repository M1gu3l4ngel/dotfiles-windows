---
paths:
  - "**/*.md"
---

# Documentación

Aplica a `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `docs/` y los `README.md`
de cada carpeta.

## Estilo

- **Sin iconos ni emojis.** Texto sobrio.
- Lenguaje directo y simple. Sin relleno ni marketing.
- En español. Términos técnicos, comandos y rutas tal cual.
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
