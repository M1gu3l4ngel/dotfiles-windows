# Changelog

Notable changes to the project. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[semantic versioning](https://semver.org/).

## [Unreleased]

### Added

- `50-claude/hooks/follow-ci.mjs`: a push is finished only when its CI is green. After a `git push`
  of a branch the hook records the repository and commit, and the turn cannot end while that run is
  queued, running or red; a template release had gone out red and nobody followed it.
- `50-claude/hooks/outward-rules.mjs`: the global hook asks before reading a `.env` through the
  shell, writing through `gh api`, setting secrets or repository settings, changing Railway or a
  linked Supabase database; and denies merging a pull request, deleting on GitHub and piping a
  script from the internet into a shell. Tested in `outward-rules.test.mjs`. A write to the
  settings of a repository or an organization through `gh api` asks too when it is an implicit
  POST (`--input`, `-f`, `-F`), told by its path (`rulesets`, `protection`, `hooks`, `secrets`).
- Community files: `SECURITY.md` (private reports through GitHub), `CODE_OF_CONDUCT.md`
  (Contributor Covenant 2.1), the pull request template and the bug and feature request forms,
  with blank issues off and vulnerabilities sent to `SECURITY.md`. `CONTRIBUTING` follows the
  standard sections, and the README ends in Documentation, Contributing, Security and License.
- `check-docs.mjs --community personal|shared|public` fails when a repo lacks a file its kind
  carries (NOTICE included under Apache-2.0), and leaves out `.github/`, whose templates are
  English only. `tools/check.ps1` runs it as a public repo.
- The panel README shows how to check the task format in a repo's CI: a checkout of
  dotfiles-windows pinned to a commit and `panel/check.mjs`, ready to copy.
- `50-claude/skills/new-repo/docs-standard.md`: the documentation standard for every repo, with
  bilingual templates in `templates/` (README, CHANGELOG, CONTRIBUTING, SECURITY,
  CODE_OF_CONDUCT, NOTICE and the GitHub templates). It sets which files a personal, shared or
  public repo carries, the license, the order and names of each file's sections and the writing
  style; `new-repo`, `repo-conventions`, the global `CLAUDE.md` and this repo's documentation
  rule point to it. The README follows it: Structure, How it works, Getting started, Usage,
  Troubleshooting, then the fixed ending.
- `tools/check.ps1` fails on a Spanish code comment (`50-claude/tools/check-comments.mjs`, with
  tests, shared with any repo through `~/.claude/tools` and configured by its
  `.claude/comments.json`) and prints what it exempts: Markdown, string literals and terms quoted with «» or backticks.
- `block-forbidden-commands.mjs` lets Claude create a signed release tag (`git tag -s`) and still
  blocks deleting, moving or creating an unsigned tag. Its rules have tests, run by
  `tools/check.ps1`.
- `install.ps1` also adds the template's missing `deny`/`ask` rules to an existing
  `~/.claude/settings.json`, and `-Check` reports them; the template denies reading `.gnupg`
  and the Linux secret stores (`.password-store`, `.local/share/keyrings`).
- `50-claude/hooks/command-rules.mjs`: single source of the universal command rules, linked
  into `~/.claude/hooks/`. Projects keep an identical copy, checked against this one.
- `new-repo` creates the `Protect main` ruleset (no deletion, no force push) with the repo,
  from `skills/new-repo/rulesets/protect-main.json`, and `repo-conventions` asks for it.
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

- Documentation is English only: the `.es.md` copies and the language selectors are gone, the
  global rule, `docs-standard.md` and the `new-repo` templates ask for one language, and
  `check-docs.mjs` now fails on a translated copy, a selector, or a broken link or anchor.
- The git identity leaves the public repo: `15-git/gitconfig` keeps only what can be public, and
  `bootstrap.ps1` writes the name and email to `~/.gitconfig.local` from `-GitName` and
  `-GitEmail` (the owner's by default) when the machine has none, instead of
  `git config --global`, which wrote through the link into the repo. A fork commits under its own
  name, and `install.ps1 -Check` reports a missing identity.
- The README header follows the `new-repo` recipe, like the owner's other repos: logo with its
  light and dark versions, centered description, a row of links and badges. The global
  `repo-conventions` rule now asks for that header, compared with another repo of the same owner.
- `check-docs.mjs` also checks the HTML links and images (`href`, `src`, `srcset`) of a README
  header.

- `check-comments.mjs` also checks test names (node:test, Jest, Vitest, Pester, bats), and prints
  its exemptions when it fails too.

- `block-forbidden-commands.mjs` lets `git reset [HEAD] -- <paths>` unstage files and asks before
  a reset that moves HEAD or the index without touching the files (`--soft`, `--mixed`, no
  option); `--hard`, `--merge` and `--keep` stay denied.

- The bilingual docs check moves from `tools/check-docs.ps1` to
  `50-claude/tools/check-docs.mjs`, with tests and the same checks, so any repo (dotfiles-parrot
  included) runs one implementation; each repo passes its own exclusions with `--exclude`.

- The Claude Code layer's links live in `50-claude/links.json`, read by `lib/links.ps1` and by
  dotfiles-parrot's `lib/links.sh`. `50-claude/tools/` is linked as `~/.claude/tools`, so any
  repo can run the shared tools.

- The `~/.claude/settings.json` merge moves from `install.ps1` to
  `50-claude/tools/install-settings.mjs` (with `--check` and tests), so dotfiles-parrot's
  `install.sh` applies the template the same way. The result is the same as before.

- `block-forbidden-commands.mjs` asks before a `git pull --ff-only` instead of denying it: a
  fast-forward loses no work, and a read-only clone needs it. A pull that rebases, merges or
  forces is still denied. `git -C <folder> add -A` is now denied too: it slipped through.

- The global `CLAUDE.md` works on Windows and Linux: it names "the work folder" from
  `entorno.md` instead of `D:`, asks to say which privileges a command needs, and moves the
  system traps (junctions, robocopy, deletes without a recycle bin) to `entorno.md`, whose
  template now covers both systems. Its language rule matches the comment guide: code
  comments, script output, hook messages and test names are English.

- Code comments, script output, hook messages and test names are written in
  English, following the new guide `docs/contributing/comments.md`.
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
