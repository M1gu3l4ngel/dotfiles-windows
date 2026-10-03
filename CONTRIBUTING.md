**English** | [Español](CONTRIBUTING.es.md)

# Contributing

It is a personal repo, but it follows a standard flow to keep it clean and
reproducible.

## Flow

1. Create a branch from `main`.
2. Make the changes following the conventions below.
3. Run the checks from the repo root. They must all pass:

   ```powershell
   .\tools\check.ps1
   ```

4. Make a commit following the commit format.
5. Open a pull request. CI runs the same checks and reports the result on
   GitHub.

If the change is visible to the user, add it to the changelog
([CHANGELOG.md](CHANGELOG.md) and its Spanish pair) under the
"Unreleased" / "Sin publicar" section.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format on
a single line of 72 characters at most, with the description in Spanish:

```
type(scope): <description>
```

- `type` in English: `feat`, `fix`, `docs`, `style`, `refactor`, `chore`, `ci`.
- `scope` optional: the affected component (`install`, `bootstrap`, `vscode`...).
- **A single commit** per set of changes, even if it touches several files.

The repo is public and every commit publishes the author's email: use the GitHub
**noreply email** and **sign commits with GPG**. How to set it up:
[docs/gpg-signing.md](docs/gpg-signing.md).

## Documentation in two languages

All documentation exists in English (`X.md`) and Spanish (`X.es.md`), with the
language selector on the first line. When you change a document, change its
pair in the same commit. `.\tools\check.ps1` (`tools\check-docs.ps1`) fails if
they do not share the same structure (sections, tables, lists, links), if their
code blocks differ (commands are not translated) or if there are broken links
or anchors.

Code comments, commit messages and the rules in `.claude/rules/` are written in
Spanish only.

## Conventions

They live in `.claude/rules/`. They are plain Markdown: they work the same for
people and for Claude Code, which loads them automatically.

| File | What it defines |
|---|---|
| `security.md` | Personal and company data, secrets, verified downloads |
| `git.md` | Commits, format, signing, noreply email |
| `file-edits.md` | Editing with Edit/Write, protected files |
| `powershell.md` | PowerShell conventions |
| `documentation.md` | Documentation style and the two-language rule |
| `environment.md` | Disks, Developer Mode, symlinks, WSL |

The most important points:

- Never include personal or company data (username, emails, IPs, fingerprints,
  internal endpoints). Review `vscode/settings.json` before committing:
  extensions write keys there.
- Anything that does not come from winget is downloaded at a pinned version and
  verified with SHA-256.
- Documentation stays plain, without emojis.

## Reporting issues

Open an issue with what you expected, what happened, the Windows version and the
steps to reproduce it (with a screenshot if it is visual).
