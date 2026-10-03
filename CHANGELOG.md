**English** | [Español](CHANGELOG.es.md)

# Changelog

Notable changes to the project. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[semantic versioning](https://semver.org/).

## [Unreleased]

### Added

- Full documentation in English and Spanish: each `X.md` document (English, the
  one GitHub shows) has its `X.es.md` pair, with a language selector. This
  covers the README, `CONTRIBUTING`, this changelog, `docs/` and the READMEs of
  `apps/` and `claude/`. `tools/check.ps1` (`tools/check-docs.ps1`) fails if a
  pair is missing, if they differ in structure, links or code blocks, or if
  there are broken links or anchors.
- Global formatting style (`format/`, a copy of the one in dotfiles-parrot):
  `.prettierrc.json` and `.editorconfig` linked into the profile and into
  `<disk>\Dev`, for projects without their own configuration (tabs, double
  quotes, 100 columns). A project with its own never uses the global one. The
  repo has its own `.prettierrc.json` and `.prettierignore`.
- VS Code formats shell with shfmt (`bootstrap.ps1` installs it) and SQL with
  SQLTools, reads `.editorconfig` (EditorConfig extension) and saves on focus
  change so that formatting on save always runs.
- Global Claude Code layer (`claude/`): universal `CLAUDE.md`, status line, a
  hook that enforces editing with Edit/Write, a `settings.json` template
  (secrets in `deny`/`ask`) and `check-budget.mjs`, linked by `install.ps1`.
- `uninstall.ps1` + `lib/links.ps1`: uninstaller that reverts the symlinks and
  restores the backups (with `-DryRun`); the symlink mapping is shared between
  `install.ps1` and `uninstall.ps1` so they never drift apart.
- `tools/check.ps1` + `PSScriptAnalyzerSettings.psd1`: local quality checks
  (syntax, PSScriptAnalyzer, JSON, public repo hygiene, LF).
- CI on GitHub Actions (windows-latest): runs `tools/check.ps1` on every push and
  pull request, with actions pinned by commit SHA and minimal permissions.
- `bootstrap.ps1`: one-command environment install, idempotent, with a `-DryRun`
  mode. Installs the essential winget set, Nerd fonts verified by SHA-256, the
  Node toolchain, environment variables, WSL and the symlinks.
- `.gitattributes` (LF line endings across the repo) and `.editorconfig`.
- `apps/`: reference snapshot of applications: `winget-dev.json` (public,
  environment/dev only) and `winget-full.local.json` (complete, gitignored).
- `.claude/rules/`: modular rules (security, git, file-edits, powershell,
  documentation, environment), which Claude Code loads on its own.
- `CONTRIBUTING.md` and `CHANGELOG.md`.
- `bash/`: Git Bash profile with the same prompt (oh-my-posh).

### Changed

- PowerShell profile ~48% faster: Terminal-Icons is loaded lazily (OnIdle).
- Prompt (oh-my-posh): uniform dark text, consistent across VS Code, Windows
  Terminal and Parrot.
- Prompt theme synced with dotfiles-parrot: the tab title uses `POSH_NAME` like
  the prompt and shows `~` in the home folder instead of its name (screenshots no
  longer show the real username), and the git changes
  icon is the `` escape instead of a literal glyph. The README explains
  how to change the name for a single terminal (`$env:POSH_NAME`), as in Parrot.
- `.ps1` scripts in pure ASCII (no BOM) for PowerShell 5.1 compatibility.
- `install.ps1`: dated backup if one already exists, symlink capability check
  before touching anything, and robust path comparison.
- `bash/.bashrc`: the repo location is derived from the symlink (works even if it
  is not cloned into `~/dotfiles`).
- Font updated to **CaskaydiaCove Nerd Font** (Nerd Fonts v3.5.1); Hack was
  documented before.
- Documentation rewritten in a plain style, without emojis.
- `CLAUDE.md` split into modular rules under `.claude/rules/`.

### Security

- `tools/check.ps1` no longer writes the sensitive literals it looks for into
  the repo: it reads them from `tools/hygiene-patterns.local` (ignored by git)
  or from the `DOTFILES_HYGIENE_PATTERNS` variable. They were purged from the
  history, commit authorship included.
- History purge with `git-filter-repo`: a leaked API key and company connection
  data (Fabric server, corporate email, Azure IDs) that had been public since the
  initial commit were removed from **every** commit.
- `vscode/settings.json` sanitized; `*.local.json` added to `.gitignore`.
