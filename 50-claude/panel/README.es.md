[English](README.md) | **Español**

# Panel de tareas

Un artefacto de Claude Code que muestra las tareas de un repo. Es una **vista** de
`docs/tasks.md` y `docs/backlog.md`: la página no se edita nunca a mano, se regenera
desde esos dos archivos y se vuelve a publicar. Lo que el panel muestra no puede
diferir de lo que dice el repo.

El panel es neutro: no nombra ningún proyecto. Cada repo lo activa y lo configura
con su propio `.claude/panel.json`. Un repo sin ese archivo no tiene panel, y los
hooks no hacen nada en él.

## Archivos

| Archivo | Qué es |
|---|---|
| `board.html` | La página: tres vistas (En curso, Por probar, Pendientes), tarjetas por plataforma, filtros, búsqueda y marcas guardadas en el navegador |
| `panel-theme.css` | Colores, radios y tipografía, en claro y oscuro: Inter y JetBrains Mono de Google Fonts |
| `board.mjs` | Parser y validador de los dos `.md` |
| `board.test.mjs` | Tests del parser (`node --test`, sin dependencias) |
| `panel-files.mjs` | Rutas, configuración y huella de las fuentes, compartidos por los comandos y los hooks |
| `generate.mjs` | Valida las fuentes y escribe el panel en `.claude/artifacts/` |
| `check.mjs` | Solo valida, para el check y el CI de un repo |
| `init.mjs` | Prepara un repo: crea `panel.json` y los dos `.md` si faltan |
| `hooks/panel-session-start.mjs` | `SessionStart`: dice a Claude dónde está el panel y si está desfasado |
| `hooks/panel-record-publish.mjs` | `PostToolUse` (Artifact): guarda la URL publicada y la huella |
| `hooks/panel-remind-refresh.mjs` | `PostToolUse` (Edit\|Write): avisa cuando cambia una fuente |

`install.ps1` enlaza la carpeta entera en `~/.claude/panel` y registra los tres
hooks en `~/.claude/settings.json`.

## Usarlo en un repo

1. En la raíz del repo, crea los archivos:

    ```bash
    node ~/.claude/panel/init.mjs
    ```

2. Pon en `.claude/panel.json` las plataformas y los dispositivos del repo. Cada
   entrada es un id y el nombre que se escribe en los `.md`:

    ```json
    {
      "project": "my-project",
      "platforms": { "web": "Web app", "repo": "Repository" },
      "devices": { "mobile": "Mobile", "desktop": "Desktop" }
    }
    ```

3. Genera el panel. Se niega a hacerlo si los `.md` tienen problemas de formato:

    ```bash
    node ~/.claude/panel/generate.mjs
    ```

4. Pide a Claude que publique `.claude/artifacts/project-board.html` con `tasks.json`
   y `panel-theme.css` al lado. A partir de ahí, los hooks le avisan cuando el panel
   queda desfasado.

5. Comprueba el formato en el CI, para que una tarea mal escrita haga fallar el
   push en vez de desaparecer del panel. El CI no tiene `~/.claude`: hace checkout
   de dotfiles-windows fijado a un commit, como una acción, así que una versión
   nueva del panel no cambia lo que pasa hasta que se mueve el SHA. En el job de
   `.github/workflows/ci.yml`, tras el checkout del propio repo:

    ```yaml
          - name: Check out the Claude Code layer (dotfiles-windows)
            uses: actions/checkout@<checkout-sha> # <version>
            with:
              repository: M1gu3l4ngel/dotfiles-windows
              ref: <commit-sha>
              path: .ci/dotfiles-windows
              persist-credentials: false

          - name: Check the task panel format
            run: node .ci/dotfiles-windows/50-claude/panel/check.mjs .
    ```

    El check local del repo corre lo mismo con `node ~/.claude/panel/check.mjs .`.
    El mismo checkout sirve para `tools/check-docs.mjs` y `tools/check-comments.mjs`.

`.claude/artifacts/` se ignora a sí misma: lo generado y la URL publicada no se
versionan.

## Formato de `docs/tasks.md`

Solo trabajo pendiente: una tarea hecha se borra, no se marca. Las fases van en el
orden en que se trabajan:

- `# Fase N — nombre`, con bloques `##`. Cada bloque lleva `**Plataforma:**`,
  `**Prioridad:**` (P0, P1, P2 o Mejora, en ese orden dentro de la fase) y
  `**Requiere:**` (otros bloques entre «», o «nada»).
- `# Por probar`: lo que el usuario debe comprobar, un bloque por cambio con su
  plataforma. Una casilla que vale para unos dispositivos concretos los nombra
  delante: `- [ ] [Mobile] …`.
- `# Cierre — …`, `# Lo hace el dueño — …`, `# Aplazado — …` y
  `# Bloqueado por terceros — …`.
- `**Estado:** en curso` en el bloque que se está trabajando, y solo en uno.

`docs/backlog.md` usa bloques `###`, con plataforma y sin prioridad ni requisito.
`check.mjs` detecta lo que el panel no podría mostrar fielmente: casillas marcadas,
nombres desconocidos, campos que faltan, prioridades desordenadas, fases vacías y
más de un bloque en curso.
