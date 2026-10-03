**English** | [Español](README.es.md)

# Global Claude Code layer

**Universal** Claude Code behavior, the same on any project, PC and operating
system. What is specific to a project lives in that project's repo; what is
specific to a machine stays local (it is not versioned).

## What is here (generic, no personal data)

| File | Linked to | What it is |
|---|---|---|
| `CLAUDE.md` | `~/.claude/CLAUDE.md` | Universal rules: bilingual documentation, disk, editing with Edit/Write, confirming before deleting, interaction, compaction |
| `statusline.mjs` | `~/.claude/statusline.mjs` | Status line (model, context in tokens, folder) |
| `hooks/block-shell-edits.mjs` | `~/.claude/hooks/block-shell-edits.mjs` | `PreToolUse` hook that enforces editing with Edit/Write (blocks `sed -i`, redirections, heredocs… and lets temporary files through). Portable Windows/Linux |
| `settings.template.json` | — (template) | Portable base for `settings.json`: generic secret `deny`/`ask` rules + hook registration + `skillOverrides` |
| `check-budget.mjs` | — (script) | Budget guard: counts the lines of `CLAUDE.md`/`statusline`/`hook` and fails if they exceed it. `node claude/check-budget.mjs`. Portable |

## What is NOT versioned (stays local, per machine)

- **`~/.claude/entorno.md`**: the machine's physical details (disks, paths, user)
  and private data. Each PC has its own. It **never** goes into a public repo.
- **`~/.claude/settings.json`**: it has paths with your username, `autoMode` (which
  each machine generates and which is only read from the global settings) and
  plugins. It stays local.
- History, sessions, memory (`~/.claude/projects/**`), caches, `file-history`.

## Setting up a new machine (Windows or Linux)

1. Clone the repo and run the installer: it links the 3 files above into `~/.claude/`.
    - Windows: `./install.ps1` (needs Developer Mode or admin for symlinks).
2. Create `~/.claude/settings.json` from `settings.template.json`:
    - Replace `REEMPLAZA_RUTA_HOME` with the real home (Windows `C:/Users/<user>`,
      Linux `/home/<user>`).
    - Optional (more reliable on Windows): also add **absolute** paths to your
      secrets, for example `Read(//d/Dev/security-keys/**)`, next to the generic `**/`
      patterns.
3. Create your local `~/.claude/entorno.md` with that machine's details (not versioned).

The secret patterns use `**/` (portable Windows/Linux) and contain no personal
data. `deny` blocks keys/credentials outright; `.env*` stays in `ask` (it asks
before reading, so it can guide you without exposing values in the context).
