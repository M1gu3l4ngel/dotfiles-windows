# Contributing

Thank you for helping. It is a personal repo, but it follows a standard flow to keep it clean and
reproducible on any Windows 11 PC.

## Before you start

- **A bug or a small fix:** open a pull request directly, or an issue with the
  [bug report form](https://github.com/M1gu3l4ngel/dotfiles-windows/issues/new/choose).
- **A new app, a new folder or a change to what `bootstrap.ps1` installs:** open an issue first
  and describe the problem it solves. It changes every PC that pulls the repo, so it is agreed
  before it is written.
- **A vulnerability:** never in a public issue; follow [`SECURITY.md`](SECURITY.md).
- **Conduct:** everyone who takes part follows the [code of conduct](CODE_OF_CONDUCT.md).

## Set up

It needs Windows 11, PowerShell 7, git and Node.js 24; the [README](README.md#prerequisites)
explains how to get them. Clone the repo, make a branch from `main` and run the checks from its
root, in PowerShell 7 as a normal user. They are the same ones CI runs:

```powershell
.\tools\check.ps1
```

To see what the installer would change on your PC without changing anything:

```powershell
.\bootstrap.ps1 -DryRun
.\install.ps1 -Check
```

## What a change has to keep

- **Nothing personal or from a company:** no username, email, IP, hostname, key fingerprint or
  internal endpoint. Review `30-vscode/vscode/settings.json` before committing: extensions
  write keys there. Details in `.claude/rules/security.md`.
- **Verified downloads:** apps come from winget; anything else is downloaded at a pinned
  version and verified with SHA-256.
- **Idempotent scripts:** each step checks whether it is already done, so a script can run
  again without breaking anything.
- **Documents in English only:** no `X.es.md` copy and no language selector. `.\tools\check.ps1`
  (`50-claude/tools/check-docs.mjs`) checks it, links and anchors included. Where a flow reads
  better drawn, a Mermaid diagram with English labels.
- **English** in code comments, script output, hook messages and test names, following
  [docs/contributing/comments.md](docs/contributing/comments.md). The rules in
  `.claude/rules/` and the task lists (`docs/tasks.md`, `docs/backlog.md`) are Spanish only.
- **Plain documentation:** no emojis, commands that copy and work as they are.

The conventions live in `.claude/rules/`. They are plain Markdown: they work the same for
people and for Claude Code, which loads them automatically.

| File | What it defines |
|---|---|
| `security.md` | Personal and company data, secrets, verified downloads |
| `git.md` | Commits, format, signing, noreply email |
| `file-edits.md` | Editing with Edit/Write, protected files |
| `powershell.md` | PowerShell conventions |
| `documentation.md` | Documentation style and the two-language rule |
| `environment.md` | Disks, Developer Mode, symlinks, WSL |
| `task-tracking.md` | `docs/tasks.md` and `docs/backlog.md` (in Spanish): what is left to do, and the task panel generated from them |

## Commits and pull requests

Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): a title
of 72 characters at most, a blank line and a body with one dash per concrete change (no body
only when the title says it all), in English and in the imperative:

```
type(scope): <summary>

- <change>
- <change>
```

- `type` in English: `feat`, `fix`, `docs`, `style`, `refactor`, `chore`, `ci`.
- `scope` optional: the affected component (`install`, `bootstrap`, `vscode`...).
- **One commit per verified change**: two independent changes go in two commits, so each one
  can be reviewed and reverted on its own.
- Add files by path, never with `git add -A` or `git add .`.
- The repo is public and every commit publishes the author's email: use the GitHub **noreply
  email** and **sign commits with GPG**, as [docs/gpg-signing.md](docs/gpg-signing.md)
  explains.

A pull request does one thing and fills in its template. A change people notice adds its line
under "Unreleased" in [CHANGELOG.md](CHANGELOG.md) and under "Sin publicar" in its Spanish
pair. CI has to pass: the same checks as `.\tools\check.ps1`, plus the secrets scan.

## License

By contributing, you agree that your contribution is licensed under [MIT](LICENSE), like the
rest of the repo.
