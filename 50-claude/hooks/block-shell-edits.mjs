#!/usr/bin/env node
// Global PreToolUse hook for Bash and PowerShell: blocks file edits made through the shell.
//
// ~/.claude/CLAUDE.md asks for Edit or Write. As an instruction it can be overridden mid-session
// (a plugin or auto mode may suggest sed), so this hook enforces the clear cases: in-place
// editors, redirections to a file, heredocs into an interpreter, writing cmdlets and inline code
// that writes.
//
// Output sent to a temp folder (logs, scratchpad, the work folder's scratch, /tmp) or /dev/null passes:
// the rule protects working files, not a command's output. Running a script already written with
// Write (`node scratchpad/sweep.mjs`) passes too. Runs the same on Windows and Linux.

const TEMP_TARGET =
	/^(\/dev\/null|\$null|nul)$|\$\{?(env:)?(TEMP|TMP|TMPDIR)\b|(^|[\\/])(tmp|temp)[\\/]|scratchpad|[\\/]dev[\\/]scratch[\\/]/i;

const IN_PLACE = /\bsed\s+(-[a-zA-Z]*i|--in-place)|\bperl\s+-[a-zA-Z]*i|\b(g?awk)\s+-i\s+inplace/;
const HEREDOC_INTERPRETER = /\b(python3?|node|perl|ruby|tsx|deno|bun)\b[^|;&\n]*<<<?/;
const INLINE_CODE = /\b(node|python3?|perl|ruby)\s+(-e|--eval|-c|-p)\b/;
const INLINE_WRITE = /writeFile|appendFile|createWriteStream|WriteAllText|open\([^)]*['"][wa]['"]/;
const PS_WRITERS = /\b(Set-Content|Add-Content|Out-File|Clear-Content)\b|\[(System\.)?IO\.File\]::(Write|Append)/i;

/**
 * Masks quoted text with `_`, keeping the length: a `>` or a `<<` inside a string is not shell,
 * and indexes still point to the same place in the original command.
 */
function unquoted(command) {
	return command.replaceAll(/'[^']*'|"(?:[^"\\]|\\.)*"/g, (m) => `${m[0]}${"_".repeat(m.length - 2)}${m.at(-1)}`);
}

/** The target of each `>` / `>>` outside quotes, ignoring `2>&1` and `>&2`. */
function redirectTargets(command) {
	const targets = [];
	for (const match of unquoted(command).matchAll(/(\d|&)?>>?/g)) {
		// The target is read from the original: in the masked copy, quoted text is gone.
		const rest = command.slice(match.index + match[0].length);
		// No `(` or `)`: in `$(cmd 2>/dev/null)` the `)` closes the substitution, not the name.
		const target = rest.match(/^\s*(&\d|"[^"]*"|'[^']*'|[^\s;|&<>()]+)?/)?.[1] ?? "";
		if (target.startsWith("&")) continue;
		targets.push(target.replaceAll(/^["']|["']$/g, ""));
	}
	return targets;
}

function psWriteTargetIsTemp(command) {
	const path = command.match(/-(?:Path|FilePath|LiteralPath)\s+("[^"]*"|'[^']*'|\S+)/i)?.[1] ?? "";
	return TEMP_TARGET.test(path.replaceAll(/^["']|["']$/g, ""));
}

function findViolation(command) {
	const masked = unquoted(command);
	if (IN_PLACE.test(masked)) return "in-place edit (sed -i, perl -i, awk -i inplace)";
	if (HEREDOC_INTERPRETER.test(masked)) return "heredoc into an interpreter";
	if (INLINE_CODE.test(masked) && INLINE_WRITE.test(command)) return "inline code that writes files";
	if (PS_WRITERS.test(masked) && !psWriteTargetIsTemp(command)) return "cmdlet that writes a file";
	const target = redirectTargets(command).find((t) => t && !TEMP_TARGET.test(t));
	if (target) return `redirection to ${target}`;
	const tee = masked.match(/\|\s*tee\s+(?:-a\s+)?([^\s;|&()]+)/);
	if (tee && !TEMP_TARGET.test(tee[1])) return `tee into ${tee[1]}`;
	return null;
}

let input = "";
for await (const chunk of process.stdin) input += chunk;

let command = "";
try {
	command = String(JSON.parse(input).tool_input?.command ?? "");
} catch {
	process.exit(0);
}

const violation = findViolation(command);
if (violation) {
	process.stdout.write(
		JSON.stringify({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "deny",
				permissionDecisionReason:
					`Blocked by ~/.claude/hooks/block-shell-edits.mjs (${violation}). Files are ` +
					"changed with Edit or Write (see ~/.claude/CLAUDE.md). If the output is a log, " +
					"write it to the scratchpad, the work folder's scratch or $TEMP.",
			},
		}),
	);
}
process.exit(0);
