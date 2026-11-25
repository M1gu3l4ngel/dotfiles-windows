**English** | [Español](comments.es.md)

# Code comments

How comments are written in this repo: PowerShell, JavaScript (`.mjs`), shell,
JSON with comments, YAML and the configuration files that accept comments. They
are written in English, so that the code reads the same for anyone who opens it.

## Sources

The rules below come from comparing five style guides. Where they disagree, the
table says which one this repo follows.

| Topic | Google (Shell, JS, TS) | PowerShell Practice and Style | Microsoft | Linux kernel | This repo |
|---|---|---|---|---|---|
| File header | Required: "a description of its contents" (Shell); optional `@fileoverview` (JS, TS) | Comment-based help in every script | Help at the start of the script (`about_Comment_Based_Help`) | — | Required, short: what, why, where it fits |
| Function comment | Required unless "obvious and short"; arguments, outputs, returns (Shell) | Help for every function; a synopsis at least | `.SYNOPSIS`, `.PARAMETER`, `.EXAMPLE` | At the head of the function: what it does, maybe why | JSDoc or comment-based help when the name and signature are not enough |
| Inside the body | "Tricky, non-obvious, interesting or important parts"; "Don't comment everything" | Explain the reasoning, not the command | — | Avoid them; never explain how | Only why: decisions, limits, incidents |
| Repeating the code | "Avoid comments that just restate the parameter name and type" (TS) | "Do not write: # Increment Margin by 2" | — | No boilerplate that repeats the signature | Never |
| Line width | 80 columns | — | — | 80 columns | The code's limit: 100 (`printWidth`) |

[PowerShell Practice and Style](https://poshcode.gitbook.io/powershell-practice-and-style/)
is a community guide on the PoshCode site, not a Microsoft one; Microsoft's
reference is [about_Comment_Based_Help](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_comment_based_help)
and, for TypeScript, [TSDoc](https://tsdoc.org/). The others:
[Google Shell](https://google.github.io/styleguide/shellguide.html),
[Google JavaScript](https://google.github.io/styleguide/jsguide.html),
[Google TypeScript](https://google.github.io/styleguide/tsguide.html) and the
[Linux kernel](https://www.kernel.org/doc/html/latest/process/coding-style.html).

## File header

Every code file starts with a short header: what the file is, why it exists and
where it fits (who calls it, what it depends on). Two to six lines.

- It goes after what has to come first: the shebang, `// @ts-check`,
  `#Requires`.
- It does not repeat the file name or its path: the file already has them.
- It does not copy the README (usage, requirements) or keep a history (dates,
  authors, "before it did…"): that lives in the README and in git.

```js
#!/usr/bin/env node
// PreToolUse hook for Bash and PowerShell: blocks file edits made through the shell.
//
// ~/.claude/CLAUDE.md asks for Edit or Write; as an instruction it can be overridden
// mid-session, so this hook enforces the clear cases. Output sent to a temp folder passes.
```

A PowerShell script that people run takes comment-based help, so that
`Get-Help .\script.ps1` works:

```powershell
#Requires -Version 5.1
<#
.SYNOPSIS
  Links each configuration file in the repo to where its program reads it.

.DESCRIPTION
  Idempotent: an existing file is moved to a .pre-dotfiles.bak backup first.

.EXAMPLE
  .\install.ps1 -Check
#>
```

A dot-sourced library (`lib/`) and a configuration file take a plain `#` header.

## Function and type comments

Document a function when its name and signature do not say everything a caller
needs: an effect, a limit, an error it raises.

- JavaScript: JSDoc (`/** … */`) above the function. The first sentence is the
  summary. `@param` and `@returns` only when they add something to the name;
  keep the `{type}` where `// @ts-check` uses it to check types.
- PowerShell: comment-based help at the start of the function body. `.SYNOPSIS`
  in one line; `.PARAMETER` only when the name is not enough.
- A short internal function with a clear name needs no comment.

```js
/**
 * Masks the content of quoted strings with `_`, keeping the length: a `>` inside a
 * string is not a redirection, and indexes still point to the same place.
 */
function maskQuotes(command) {}
```

## Comments inside the body

Only **why**: the decision behind a line, a limit, a workaround, the incident it
prevents. Never **what**: the code already says it, and a comment that repeats it
goes stale the first time the code changes.

```powershell
# Delete() never follows the link into its target folder; Remove-Item on a directory
# link can.
(Get-Item -LiteralPath $Target -Force).Delete()
```

- Above the code it explains, not at the end of the line, unless it is a short
  note (two spaces before `#` in PowerShell).
- One comment for a block, not one per line.
- A section in a long script is a blank line and a one-line comment, never a
  banner.

## Form

- English, complete sentences, present tense, plain words.
- Within the code's line limit: 100 columns (`.prettierrc.json`).
- No banners (`# ----- X -----`, `# =====`), boxes, emojis or decorative
  capitals.
- No commented-out code: git keeps it.
- `TODO` only with the condition that ends it (`TODO: remove when …`); the
  pending work itself goes to `docs/tasks.md`.
- `.ps1` files stay in ASCII: Windows PowerShell 5.1 misreads UTF-8 without a
  BOM.

## Other text in the code

| Text | Language | Why |
|---|---|---|
| Script output (`install.ps1`, `bootstrap.ps1`, `tools/`) and CI step names | English | One text for both documentation languages to quote as is, and the `.ps1` files are ASCII, where Spanish loses its accents |
| Hook messages (`reason`) | English, short, ending in the action to take | Claude reads them and still answers the user in Spanish |
| Test names | English | They are code, and CI prints them |
| Task panel text and the headings it reads from `docs/tasks.md` | Spanish | `docs/tasks.md` is written in Spanish |

## What is not commented

- What the code, a name or a type already says.
- History: what the code did before, who changed it, when. That is git.
- Personal or machine data (users, paths, hosts): the repo is public.
- Anything the comment cannot keep true: a comment that contradicts the code is
  worse than none, so a change updates its comments in the same commit.
