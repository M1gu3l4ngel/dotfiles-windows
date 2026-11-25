# Tareas pendientes — dotfiles-windows

Solo lo que falta: lo hecho se borra. Formato y reglas en
`.claude/rules/task-tracking.md`; el panel de tareas es una vista de este archivo.

# Por probar

## Prompt tras los arreglos del perfil

**Plataforma:** Shell.

- [ ] [Esta PC] Una terminal nueva de PowerShell 7 abre con el prompt de siempre
- [ ] [Esta PC] Una terminal nueva de Windows PowerShell abre con el prompt de siempre
- [ ] [Esta PC] Una terminal nueva de Git Bash abre con el prompt de siempre

## Edición y push con los hooks nuevos

**Plataforma:** Claude Code.

- [ ] [Esta PC] Claude edita un archivo del repo sin pedir aprobación
- [ ] [Esta PC] `git push` a `main` en el repo de solo `main` pregunta en vez de denegar
- [ ] [Esta PC] `git push` a `main` en cualquier otro repo se deniega

## Panel de tareas

**Plataforma:** Claude Code.

- [ ] [Esta PC] El panel abre con las tareas de este archivo y el backlog
- [ ] [Esta PC] El selector Claro/Oscuro cambia el tema y se recuerda al recargar
- [ ] [Esta PC] «Por probar» muestra una tarjeta por plataforma y el filtro de dispositivo
- [ ] [Esta PC] Buscar abre los bloques con resultados y resalta el texto
- [ ] [Esta PC] Al abrir una sesión nueva en este repo, Claude dice si el panel está al día

# Fase 3 — Carpetas numeradas

## Un área por carpeta, un commit por área

**Plataforma:** Repositorio, Instalación.

**Prioridad:** Mejora.

**Requiere:** nada.

**Estado:** en curso.

Cada movimiento lleva su README en pareja, actualiza `lib/links.ps1`,
`.prettierignore`, `tools/check.ps1` y la documentación, y se verifica con
`.\install.ps1 -Check`.

- [ ] `10-shell`: `powershell/` y `bash/`
- [ ] `20-terminal`: `windows-terminal/` y el tema de oh-my-posh
- [ ] `30-vscode`: `vscode/`
- [ ] `40-format`: `format/`
- [ ] `50-claude`: `claude/`, con `entorno.template.md` y sin la afirmación de que es idéntico byte a byte al de Parrot
- [ ] `60-apps`: `essential.json`, que lee `bootstrap.ps1` en lugar de `$WingetEssential`, y `optional.json`, sin solaparse (lo comprueba `tools/check.ps1`)

# Fase 4 — Documentación y 1.0.0

## Documentación de proyecto abierto

**Plataforma:** Repositorio, Instalación.

**Prioridad:** Mejora.

**Requiere:** «Un área por carpeta, un commit por área».

- [ ] README como índice de las carpetas numeradas
- [ ] Guía `docs/getting-started` en pareja: una PC nueva desde cero
- [ ] `CONTRIBUTING` al día con las reglas del repo
- [ ] Corregir las entradas desfasadas del CHANGELOG
- [ ] Probar `bootstrap.ps1` y la guía en Windows Sandbox
- [ ] Cortar el CHANGELOG como 1.0.0 (el tag lo crea el dueño)

# Lo hace el dueño — decisiones y archivos protegidos

## Lista de extensiones de VS Code

**Plataforma:** VS Code.

**Requiere:** nada.

`vscode/extensions.txt` está protegido. Falta `ms-vscode.powershell`, que
`settings.json` usa como formateador; sobran `github.copilot-chat` (ya viene en VS
Code) y `exodiusstudios.comment-anchors`; faltan `dbaeumer.vscode-eslint`,
`humao.rest-client`, `ms-azuretools.vscode-containers` y
`elvisrp22.comment-translator`.

- [ ] Decidir si se regenera con `code --list-extensions > vscode/extensions.txt`
