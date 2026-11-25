**English** | [Español](README.es.md)

# Task panel

A Claude Code artifact that shows a repo's tasks. It is a **view** of
`docs/tasks.md` and `docs/backlog.md`: the page is never edited by hand, it is
regenerated from those two files and published again. What the panel shows cannot
differ from what the repo says.

The panel is neutral: it names no project. Each repo turns it on and configures it
with its own `.claude/panel.json`. A repo without that file has no panel, and the
hooks do nothing in it.

## Files

| File | What it is |
|---|---|
| `board.html` | The page: three views (En curso, Por probar, Pendientes), cards per platform, filters, search and checkmarks kept in the browser |
| `panel-theme.css` | Colors, radii and type, light and dark: Inter and JetBrains Mono from Google Fonts |
| `board.mjs` | Parser and validator for the two `.md` files |
| `board.test.mjs` | Parser tests (`node --test`, no dependencies) |
| `panel-files.mjs` | Paths, configuration and source hash, shared by the commands and the hooks |
| `generate.mjs` | Validates the sources and writes the panel to `.claude/artifacts/` |
| `check.mjs` | Validates only, for a repo's check and CI |
| `init.mjs` | Sets up a repo: creates `panel.json` and the two `.md` files if missing |
| `hooks/panel-session-start.mjs` | `SessionStart`: tells Claude where the panel is and whether it is stale |
| `hooks/panel-record-publish.mjs` | `PostToolUse` (Artifact): stores the published URL and hash |
| `hooks/panel-remind-refresh.mjs` | `PostToolUse` (Edit\|Write): warns when a source changes |

`install.ps1` links the whole folder to `~/.claude/panel` and registers the three
hooks in `~/.claude/settings.json`.

## Using it in a repo

1. In the repo root, create the files:

    ```bash
    node ~/.claude/panel/init.mjs
    ```

2. Put the repo's platforms and devices in `.claude/panel.json`. Each entry is an
   id and the name written in the `.md` files:

    ```json
    {
      "project": "my-project",
      "platforms": { "web": "Web app", "repo": "Repository" },
      "devices": { "mobile": "Mobile", "desktop": "Desktop" }
    }
    ```

3. Generate the panel. It refuses if the `.md` files have format problems:

    ```bash
    node ~/.claude/panel/generate.mjs
    ```

4. Ask Claude to publish `.claude/artifacts/project-board.html` with `tasks.json`
   and `panel-theme.css` next to it. From then on, the hooks warn it when the panel
   goes stale.

`.claude/artifacts/` ignores itself: the generated files and the published URL are
not versioned.

## Format of `docs/tasks.md`

Pending work only: a finished task is deleted, not checked. Phases go in the order
they are worked on (the headings are in Spanish, as the parser reads them):

- `# Fase N — nombre`, with `##` blocks. Each block has `**Plataforma:**`,
  `**Prioridad:**` (P0, P1, P2 or Mejora, in that order within the phase) and
  `**Requiere:**` (other blocks between «», or «nada»).
- `# Por probar`: what the user must check, one block per change with its
  platform. A checkbox that applies to specific devices names them first:
  `- [ ] [Mobile] …`.
- `# Cierre — …`, `# Lo hace el dueño — …`, `# Aplazado — …` and
  `# Bloqueado por terceros — …`.
- `**Estado:** en curso` on the block being worked on, and on one only.

`docs/backlog.md` uses `###` blocks, with a platform and no priority or requirement.
`check.mjs` catches what the panel could not show faithfully: checked boxes,
unknown names, missing fields, priorities out of order, empty phases and more than
one block in progress.
