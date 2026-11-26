# Security

## Supported versions

Only the latest commit on `main` receives fixes. Each release is listed in
[`CHANGELOG.md`](CHANGELOG.md).

## Report a vulnerability

Do not open a public issue. Report it privately on GitHub: in this repository, open
**Security**, then **Report a vulnerability**, and fill in the form.

Include what is affected (a script, a hook, a linked configuration, the CI workflow), the steps
to reproduce it and the impact you see. You get an answer that confirms the report, and you are
kept informed until it is fixed. Once the fix is published, the report is made public with
credit to you, unless you prefer otherwise.

## Scope

- **In scope:** the scripts (`bootstrap.ps1`, `install.ps1`, `uninstall.ps1`, `tools/`), the
  Claude Code hooks and tools in `50-claude/`, the CI workflow, and anything in this repository
  that could leak a secret, download something unverified or run code a user did not expect.
- **Out of scope:** vulnerabilities in the tools it installs (winget, PowerShell, Node.js,
  VS Code, Claude Code, oh-my-posh), which go to their own projects.
