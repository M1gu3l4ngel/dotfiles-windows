**English** | [Español](README.es.md)

# Global Claude Code layer

**Universal** Claude Code behavior, the same on any project, PC and operating
system. What is specific to a project lives in that project's repo; what is
specific to a machine stays local (it is not versioned).

## What is here (generic, no personal data)

| File | Linked to | What it is |
|---|---|---|
| `CLAUDE.md` | `~/.claude/CLAUDE.md` | Universal rules: bilingual documentation, disk, editing with Edit/Write, confirming before deleting, interaction, compaction |
| `rules/repo-conventions.md` | `~/.claude/rules/repo-conventions.md` | Global rule (Spanish, loaded in every project): what every repo has, and to report what is missing as a finding |
| `skills/new-repo/` | `~/.claude/skills/new-repo` | Global skill (Spanish): creates a well-built repo, or completes an existing one: GitHub description and topics, `main` protection, license, bilingual README with a diagram, CHANGELOG, `CLAUDE.md`, formatting, CI and the organization's brain catalog. Company specifics live in each company's brain |
| `statusline.mjs` | `~/.claude/statusline.mjs` | Status line (model, context in tokens, folder) |
| `hooks/block-shell-edits.mjs` | `~/.claude/hooks/block-shell-edits.mjs` | `PreToolUse` hook that enforces editing with Edit/Write (blocks `sed -i`, redirections, heredocs… and lets temporary files through). Portable Windows/Linux |
| `hooks/block-forbidden-commands.mjs` | `~/.claude/hooks/block-forbidden-commands.mjs` | `PreToolUse` hook that enforces the `CLAUDE.md` rules about commands: blocks unsigned commits, `git add -A`, forced pushes, pushes to `main`, git that rewrites history or the tree and deleting, moving or creating an unsigned tag (creating a signed one passes), `prettier --write` with a glob and `robocopy /MIR` without `/XJ`; asks before any other push, before a `git pull --ff-only` and before a recursive delete outside a temporary folder. Its rules come from `command-rules.mjs`. Portable Windows/Linux |
| `hooks/command-rules.mjs` | `~/.claude/hooks/command-rules.mjs` | Single source of the universal command rules. Each project's hook keeps an identical copy, because it travels to extracted projects without these dotfiles; the project's `hook-rules-copy` check fails if the copies differ. Edit it here and copy it whole |
| `hooks.local.example.json` | — (example) | Shape of `~/.claude/hooks.local.json`: the repos whose only branch is `main` (`owner/repo`), where the hook allows pushing to `main`. Without that file no repo has the exception |
| `hooks/reply-in-spanish.mjs` | `~/.claude/hooks/reply-in-spanish.mjs` | `PostToolUse` and `Stop` hook that keeps replies in Spanish: after each tool it warns Claude if what it last wrote is in English, and it blocks a turn that ends in English. It judges the end of the turn and ignores code, paths and identifiers. Portable Windows/Linux |
| `settings.template.json` | — (template) | Portable base for `settings.json`: generic secret `deny`/`ask` rules, hook and status line registration, `skillOverrides` and the preferences that hold on any PC (`theme`, `tui`, `autoUpdatesChannel`) |
| `check-budget.mjs` | — (script) | Budget guard: counts the lines of `CLAUDE.md`, the status line, the hooks, the rule and the skill, and fails if they exceed it. Run by `tools/check.ps1` and CI; on its own: `node 50-claude/check-budget.mjs`. Portable |
| `panel/` | `~/.claude/panel` | Task panel: an artifact generated from a repo's `docs/tasks.md` and `docs/backlog.md`, with its hooks. Each repo turns it on with `.claude/panel.json`. See [panel/README.md](panel/README.md) |
| `entorno.template.md` | — (template) | Sections of the local `~/.claude/entorno.md` (Spanish, like `CLAUDE.md`), valid on Windows and Linux, with no data from any machine |

## What is NOT versioned (stays local, per machine)

- **`~/.claude/entorno.md`**: the machine's physical details (disks, paths, user)
  and private data. Each PC has its own. It **never** goes into a public repo.
- **`~/.claude/settings.json`**: it has paths with your username, `autoMode` (which
  each machine generates and which is only read from the global settings) and
  plugins. It stays local.
- **`~/.claude/hooks.local.json`**: the hooks' personal settings (it names your
  repos). It is created by hand from `hooks.local.example.json`.
- History, sessions, memory (`~/.claude/projects/**`), caches, `file-history`.

## Setting up a new machine (Windows or Linux)

1. Clone the repo and run the installer: it links the files above into `~/.claude/`.
    - Windows: `./install.ps1` (needs Developer Mode or admin for symlinks).
2. `~/.claude/settings.json` comes from `settings.template.json`:
    - On Windows `install.ps1` creates it if the machine does not have one, with
      `REEMPLAZA_RUTA_HOME` replaced by the real home (`C:/Users/<user>`). The hook
      paths are quoted, so a home with spaces works.
    - If it already exists, the installer only adds the template hooks and `deny`/`ask`
      rules it is missing (a linked hook does not run until it is registered here, and a
      new security rule has to reach every machine), with a dated
      `.pre-dotfiles.bak` backup first; everything else in the file stays as it was.
      It runs again after each `git pull`, so a new hook reaches every machine.
    - Optional (more reliable on Windows): also add **absolute** paths to your
      secrets, for example `Read(//d/Dev/security-keys/**)`, next to the generic `**/`
      patterns.
3. Create your local `~/.claude/entorno.md` with that machine's details (not
   versioned), copying the sections of `entorno.template.md`.

The secret patterns use `**/` (portable Windows/Linux) and contain no personal
data. `deny` blocks keys/credentials outright; `.env*` stays in `ask` (it asks
before reading, so it can guide you without exposing values in the context).
