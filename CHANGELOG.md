**English** | [Español](CHANGELOG.es.md)

# Changelog

Notable changes to the project. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[semantic versioning](https://semver.org/).

## [Unreleased]

### Added

- `block-forbidden-commands.mjs` lets Claude create a signed release tag (`git tag -s`) and still
  blocks deleting, moving or creating an unsigned tag. Its rules have tests, run by
  `tools/check.ps1`.
- `install.ps1` also adds the template's missing `deny`/`ask` rules to an existing
  `~/.claude/settings.json`, and `-Check` reports them; the template denies reading `.gnupg`.

- `50-claude/skills/new-repo`: global skill that creates a well-built repo, or
  completes an existing one (GitHub description and topics, license, bilingual
  README with a diagram, CHANGELOG, `CLAUDE.md`, formatting, CI and the brain
  catalog), and `50-claude/rules/repo-conventions.md`, a short global rule that
  points to it and reports what a repo is missing. Linked by `install.ps1`.
- `15-git/`: the git configuration, linked by `install.ps1`. Each remote picks
  its GitHub account by owner; client and work organizations stay in the
  machine's `~/.gitconfig.local`, never in this public repo, and so does the
  signing key, which is specific to each machine.
- `repo-conventions`: the Node version lives only in `engines.node`, exact when
  deployed and a minimum when others install it.

### Changed

- Node comes from fnm instead of nvm-windows: each terminal switches to the
  repo's version on entering it, versions live in `<disk>\Dev\fnm`, and the
  default one stays on the PATH for apps that start without a shell profile.

## [1.0.0] - 2026-11-24

First release: the full Windows 11 environment, reproducible on a new PC with
one command.

### Added

- **Installation.**
    - `bootstrap.ps1`: idempotent install with a `-DryRun` mode. It sets the
      environment variables on the work disk (`D:`, or `C:` on a single-disk
      PC), installs the essential apps, the Nerd font, Node with pnpm and
      Claude Code, WSL with Ubuntu 26.04, the git identity, the links and the
      VS Code extensions.
    - `install.ps1`: the configuration symlinks from `lib/links.ps1`, with a
      `.pre-dotfiles.bak` backup of each existing file; `-Check` reports their
      state without changing anything. It replaces links to old repo paths,
      creates `~/.claude/settings.json` from the template when missing and
      registers new hooks in an existing one.
    - `uninstall.ps1`: reverts the links and restores the backups (`-DryRun`).
    - `githooks/post-merge`: re-runs `install.ps1` after each `git pull`, so a
      new link or hook reaches the other PCs with the pull alone.
- **`10-shell/`**: PowerShell 7 and Git Bash profiles with the oh-my-posh
  `capr4n` prompt, shared with dotfiles-parrot. Terminal-Icons loads lazily,
  and `tools/set-prompt-name.ps1` changes the name shown (`POSH_NAME`).
- **`20-terminal/`**: Windows Terminal with PowerShell 7 by default, Monokai,
  CaskaydiaCove Nerd Font (Nerd Fonts v3.5.1, verified by SHA-256) and copy on
  select.
- **`30-vscode/`**: settings, key bindings and 39 extensions; formatting on
  save with Prettier, PowerShell, shfmt and SQLTools, reading `.editorconfig`.
- **`40-format/`**: global Prettier and EditorConfig style for projects
  without their own, identical to the one in dotfiles-parrot.
- **`50-claude/`**: global Claude Code layer. A universal `CLAUDE.md` with a
  line budget, a status line, hooks that enforce editing with Edit/Write,
  block write git and risky commands and keep replies in Spanish, a
  `settings.json` template, the template of the local `entorno.md` and a task
  panel that any repo turns on with `.claude/panel.json`.
- **`60-apps/`**: `essential.json`, which `bootstrap.ps1` installs, and
  `optional.json`, picked on each PC, both in the `winget export` format.
- **Quality.** `tools/check.ps1` runs the same checks as CI: PowerShell syntax
  and PSScriptAnalyzer, JSON, no overlap between the app lists, public repo
  hygiene, LF line endings, bilingual documentation, the Claude Code layer
  budget, the panel tests and gitleaks. CI on GitHub Actions with actions
  pinned by commit SHA, and Dependabot to update them monthly.
- **Documentation** in English and Spanish, with a language selector: README as
  an index with a diagram, a new PC guide (`docs/getting-started`), commit
  signing, formatting, `CONTRIBUTING` and the README of each folder.

### Security

- History purged with `git-filter-repo`: a leaked API key and company
  connection data (Fabric server, corporate email, Azure IDs) that had been
  public since the initial commit were removed from **every** commit,
  authorship included. `30-vscode/vscode/settings.json` was sanitized and
  `*.local.json` added to `.gitignore`.
- `tools/check.ps1` does not keep the sensitive literals it looks for in the
  repo: it reads them from `tools/hygiene-patterns.local` (ignored by git) or
  from the `DOTFILES_HYGIENE_PATTERNS` variable.
- `block-forbidden-commands.mjs` names no repo: the repos where pushing to
  `main` is allowed come from the unversioned `~/.claude/hooks.local.json`
  (shape in `50-claude/hooks.local.example.json`).

[Unreleased]: https://github.com/M1gu3l4ngel/dotfiles-windows/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/M1gu3l4ngel/dotfiles-windows/releases/tag/v1.0.0
