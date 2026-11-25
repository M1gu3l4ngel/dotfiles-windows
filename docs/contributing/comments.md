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

## Lessons from the migration

This repo moved its code text from Spanish to English one folder at a time,
with one commit per folder, as the pilot for other repos.

### The six decisions

1. Script output and CI step names are English: one text both documentation
   languages quote as is, and the ASCII `.ps1` files cannot carry Spanish
   accents.
2. Hook messages (`reason`) are English, short and ending in the action to
   take: Claude reads them and still answers the user in Spanish.
3. Test names are English: they are code, and CI prints them.
4. Config files with comments are included (`.gitignore`, `.editorconfig`,
   `.psd1`, VS Code `settings.json`, Dependabot): a reader of the repo meets
   them like any script.
5. The task panel's visible text and the headings it reads from
   `docs/tasks.md` stay Spanish, because `docs/tasks.md` is written in Spanish;
   only the panel's comments changed.
6. `40-format/` changed in dotfiles-parrot in the same step, so the two copies
   stay byte for byte identical.

### What we learned

- Write the language rule into the repo's `CLAUDE.md` before migrating. A
  global rule that still says "comments in Spanish" would make the next session
  write them in Spanish again.
- Look for what reads a text before translating it. Here nothing parsed the
  script output (callers use exit codes), and no ruleset required the CI check
  by its old name.
- Scan every tracked file, not a list of folders: `15-git/` was missing from
  the plan and only showed up in that scan.
- A file shared with another repo changes in both in the same step, following
  that repo's rules: dotfiles-parrot's commits are signed by its owner.
- English did not grow the files: the hooks under the line budget
  (`50-claude/check-budget.mjs`) changed by at most one line.
- `50-claude/tools/check-comments.mjs` keeps the result. On the code before the
  migration it flags 249 comments and none on the code after it. It misses one-
  or two-word labels with no function words and no accents, such as
  `Selector segmentado (tema)`, so those still need a look in review.

## The check in any repo

The check is shared through `~/.claude/tools`, so any repo runs it from its own
folder:

```bash
node ~/.claude/tools/check-comments.mjs .
```

It knows the comments of shell, PowerShell, YAML, TOML, JavaScript, CSS, HTML,
Lua, `.ini`, `.conf`, `.rasi`, `sxhkdrc` and scripts with a shebang, and the test
names of node:test, Jest, Vitest, Pester and bats. A repo adds its own file types,
paths to skip and exemptions in `.claude/comments.json`; the exemptions print on
every run, passing or failing:

```json
{
  "styles": { "slash": ["(^|/)xkb/symbols/"] },
  "skip": ["^vendor/"],
  "exemptions": ["What this repo keeps in Spanish on purpose, and why."]
}
```
