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
| `hooks/block-forbidden-commands.mjs` | `~/.claude/hooks/block-forbidden-commands.mjs` | `PreToolUse` hook that enforces the `CLAUDE.md` rules about commands: blocks write git, `prettier --write` with a glob and `robocopy /MIR` without `/XJ`, and asks before a recursive delete outside a temporary folder. Portable Windows/Linux |
| `hooks/reply-in-spanish.mjs` | `~/.claude/hooks/reply-in-spanish.mjs` | `PostToolUse` and `Stop` hook that keeps replies in Spanish: after each tool it warns Claude if what it last wrote is in English, and it blocks a turn that ends in English. It judges the end of the turn and ignores code, paths and identifiers. Portable Windows/Linux |
| `settings.template.json` | — (template) | Portable base for `settings.json`: generic secret `deny`/`ask` rules + hook registration + `skillOverrides` |
| `check-budget.mjs` | — (script) | Budget guard: counts the lines of `CLAUDE.md`/`statusline`/`hook` and fails if they exceed it. `node claude/check-budget.mjs`. Portable |
| `tasks-artifact.template.html` | — (template) | Fixed design of the task artifact that `CLAUDE.md` asks for on multi-block work: Claude copies it, fills in the content and does not redesign it |

## What is NOT versioned (stays local, per machine)

- **`~/.claude/entorno.md`**: the machine's physical details (disks, paths, user)
  and private data. Each PC has its own. It **never** goes into a public repo.
- **`~/.claude/settings.json`**: it has paths with your username, `autoMode` (which
  each machine generates and which is only read from the global settings) and
  plugins. It stays local.
- History, sessions, memory (`~/.claude/projects/**`), caches, `file-history`.

## Setting up a new machine (Windows or Linux)

1. Clone the repo and run the installer: it links the files above into `~/.claude/`.
    - Windows: `./install.ps1` (needs Developer Mode or admin for symlinks).
2. `~/.claude/settings.json` comes from `settings.template.json`:
    - On Windows `install.ps1` creates it if the machine does not have one, with
      `REEMPLAZA_RUTA_HOME` replaced by the real home (`C:/Users/<user>`). The hook
      paths are quoted, so a home with spaces works.
    - If it already exists, the installer only adds the template hooks it is missing
      (a linked hook does not run until it is registered here), with a dated
      `.pre-dotfiles.bak` backup first; everything else in the file stays as it was.
      It runs again after each `git pull`, so a new hook reaches every machine.
    - Optional (more reliable on Windows): also add **absolute** paths to your
      secrets, for example `Read(//d/Dev/security-keys/**)`, next to the generic `**/`
      patterns.
3. Create your local `~/.claude/entorno.md` with that machine's details (not versioned).

The secret patterns use `**/` (portable Windows/Linux) and contain no personal
data. `deny` blocks keys/credentials outright; `.env*` stays in `ask` (it asks
before reading, so it can guide you without exposing values in the context).
