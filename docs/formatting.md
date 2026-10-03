**English** | [Español](formatting.es.md)

# Code formatting

The style lives in two files that every tool reads (VS Code, the Prettier CLI,
CI), not in the editor settings. They are a copy of the ones in
[dotfiles-parrot](https://github.com/M1gu3l4ngel/dotfiles-parrot), so both
machines format the same way.

| File | Linked to | What it formats |
|---|---|---|
| `format/prettierrc.json` | `~\.prettierrc.json` and `<disk>\Dev\.prettierrc.json` | Prettier: JS, TS, JSON, CSS, HTML, Markdown and YAML |
| `format/editorconfig` | `~\.editorconfig` and `<disk>\Dev\.editorconfig` | Indentation and line endings of everything else (shell, SQL, TOML, `.env`) |

## Why two locations

Prettier and EditorConfig look for their configuration walking up from the
file's folder. On Windows the projects live in `<disk>\Dev` (`D:\Dev`, or
`C:\Dev` on a machine without a `D:` disk), outside the profile, so a file
only in `~` would never reach them. `install.ps1` creates both links.

## Precedence

The configuration closest to the file wins, with no merging:

- A project with its own `.prettierrc` or `.editorconfig` (with
  `root = true`) uses its own and never the global one.
- The global one only applies to files that have no configuration of their own.
- A shared project or one with CI must always carry its own: CI and other
  people do not have your machine.

## In VS Code

On save, VS Code formats with Prettier; shell with shfmt (it reads the
`.editorconfig`), and SQL with SQLTools. It only saves when you switch tab or
window (`"files.autoSave": "onFocusChange"`): time-based autosave does not
format. VS Code reads `.editorconfig` through the EditorConfig extension,
listed in `vscode/extensions.txt`.

To change the style, edit both files with the same values and keep them
identical to the ones in dotfiles-parrot.
