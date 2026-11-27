// @ts-check
// Universal command rules, shared by the global hook (dotfiles) and each project's hook.
//
// Single source: this file lives in `dotfiles/50-claude/hooks/`, and each project keeps an
// identical copy in `.claude/hooks/`, because its hook travels to extracted projects where the
// dotfiles do not exist. Edit it here and copy it as is; each project's `dotfiles-copies` check
// fails if the two copies differ. What belongs to one project (its package manager, its ports,
// its `main`) goes in that project's hook, never here.
//
// This is a hook and not `permissions.deny` because a permission pattern matches by prefix: it
// misses a `git commit` after `cd x &&`, one inside PowerShell, or a `/MIR` in the middle of a
// `robocopy`. `ask` does not block: it hands the decision to the user.

import os from "node:os";
import path from "node:path";

/**
 * @typedef {object} CommandRule
 * @property {RegExp} pattern Tested against the command with its quoted text masked.
 * @property {(command: string, cwd: string) => boolean} [applies] Extra condition, on the
 *   original command and the session folder.
 * @property {"deny" | "ask"} decision
 * @property {string} reason
 */

// Temp folders and regenerable caches: deleting them needs no confirmation. One entry per kind.
const TEMP_ENV = String.raw`\$\{?(env:)?(TEMP|TMP|TMPDIR)\b|(^|[\s"'\\/])(tmp|temp)[\\/]`;
const TEMP_DIRS = String.raw`scratchpad|[\\/]dev[\\/]scratch[\\/]|node_modules|[\\/]\.next\b|[\\/]coverage\b`;
const TEMP_TARGET = new RegExp(`${TEMP_ENV}|${TEMP_DIRS}`, "i");

// `git` and its global options (`git -C ../other push`): every git rule starts here, and one that
// left the options out was skipped by `git -C`.
const GIT = String.raw`\bgit\s+(?:-[cC]\s+\S+\s+)*`;
const GIT_PUSH = String.raw`${GIT}push\b`;
const GIT_PUSH_ARGS = new RegExp(`${GIT_PUSH}([^;&|]*)`, "g");

// The branch Claude pushes to on its own: every 15 to 20 commits, then it follows CI to green and
// the user promotes `main` by hand.
const RELEASE_BRANCH = "staging";
// Push options that do not change what is updated. Any other one (`--tags`, `--delete`,
// `--mirror`, `--all`) widens the push, so it asks.
const PLAIN_PUSH_OPTION = /^(?:-u|--set-upstream|-q|--quiet|-v|--verbose)$/;

// Git writes are judged by what they can lose, not by their name. Switching or creating a branch,
// merging, rebasing local commits, stashing, cherry-picking and reverting keep every version in
// the reflog, and what is published is guarded by the force-push rule here and by the remote's
// branch protection: they pass, so a team of agents can branch, integrate and catch up. Denied is
// only what discards uncommitted work or deleted commits for good, which no command undoes.
const DISCARDING_WRITES = [
	String.raw`reset\b[^;&|]*\s--(?:hard|merge|keep)\b`, // overwrites the working tree
	String.raw`checkout\b[^;&|]*\s(?:--(?:\s|$)|\.(?:\s|$)|-f\b|--force\b)`, // overwrites files with the index
	String.raw`switch\b[^;&|]*\s(?:-f\b|--force\b|--discard-changes\b)`,
	String.raw`restore\b(?![^;&|]*\s(?:-S|--staged)\b(?![^;&|]*\s(?:-W|--worktree)\b))`, // --staged alone only unstages
	String.raw`clean\b[^;&|]*\s-[a-zA-Z]*f`, // deletes untracked files
	String.raw`stash\s+(?:drop|clear)\b`, // a dropped stash is unreachable
	String.raw`branch\b[^;&|]*\s(?:-D\b|--delete\s+--force\b|--force\s+--delete\b)`, // deletes unmerged commits
	String.raw`rebase\b[^;&|]*\s(?:-i\b|--interactive\b)`, // needs an editor nobody can drive here
	String.raw`pull\b[^;&|]*\s(?:-f\b|--force\b)`, // may overwrite local branches with the remote's
];
const GIT_DISCARDING_WRITE = new RegExp(`${GIT}(?:${DISCARDING_WRITES.join("|")})`);
// Applying a mailed or pasted patch changes the tree with code nobody reviewed here.
const GIT_PATCH = new RegExp(String.raw`${GIT}(?:apply|am)\b`);

// A release's signed tag closes it, the way a signed commit closes a change: Claude creates it.
// Deleting or moving it rewrites a published release, and a tag is never unsigned. Listing and
// verifying tags start with an option other than -a/-m, so they are not a creation.
const GIT_TAG = String.raw`${GIT}tag\b`;
const GIT_TAG_FORBIDDEN = new RegExp(
	String.raw`${GIT_TAG}[^;&|]*\s(?:-d|--delete|-f|--force|--no-sign)\b`,
);
const GIT_UNSIGNED_TAG = new RegExp(
	String.raw`${GIT_TAG}(?![^;&|]*\s(?:-s|--sign)\b)\s+(?:-a\b|--annotate\b|-m\b|[^-\s;&|])`,
);

// Unstaging paths (`git reset [HEAD] -- <paths>`) only touches the index: it passes. Any other
// reset without --hard, --merge or --keep keeps the files and the reflog undoes it: it asks. Kept
// as strings: a rule's pattern must not be global, because `.test()` on a global regex keeps
// `lastIndex` between calls; `replaceAll` builds its own global copy.
const GIT_RESET = String.raw`${GIT}reset\b`;
const GIT_UNSTAGE = String.raw`${GIT_RESET}(?:\s+(?:-q|--quiet))*(?:\s+HEAD)?\s+--\s[^;&|]*`;
const GIT_SOFT_RESET = String.raw`${GIT_RESET}(?![^;&|]*\s--(?:hard|merge|keep)\b)[^;&|]*`;

/**
 * Masks quoted text with `_`, keeping the length: a `git commit` inside a search pattern or a
 * message is not a command.
 *
 * @param {string} command
 */
export function stripQuotedText(command) {
	return command.replaceAll(/'[^']*'|"(?:[^"\\]|\\.)*"/g, (m) => `${m[0]}${"_".repeat(m.length - 2)}${m.at(-1)}`);
}

/**
 * The folder the command's git runs in: the one from a leading `cd`, `Set-Location` or
 * `git -C`, or the session's.
 *
 * @param {string} command
 * @param {string} cwd
 */
export function resolveCommandDir(command, cwd) {
	const match = /(?:\bgit\s+-C\s+|\b(?:cd|Set-Location)\s+)("[^"]+"|'[^']+'|[^\s;&|]+)/i.exec(
		command,
	);
	if (!match?.[1]) return cwd;
	return path.resolve(cwd, toNativePath(match[1].replaceAll(/^["']|["']$/g, "")));
}

/**
 * A folder as the shell wrote it, as the system reads it: `~` is the home folder, and on Windows
 * Git Bash's `/d/Dev` is `D:/Dev`. Read as is, `path.resolve` turned `/d/Dev` into `D:\d\Dev`, a
 * folder that does not exist, so a repo's exceptions (its main-only push) were never found.
 *
 * @param {string} dir
 * @param {NodeJS.Platform} [platform]
 */
export function toNativePath(dir, platform = process.platform) {
	if (dir === "~" || dir.startsWith("~/")) return path.join(os.homedir(), dir.slice(1));
	const [, letter, rest] = /^\/([a-z])(\/.*)?$/i.exec(dir) ?? [];
	if (platform === "win32" && letter) return `${letter.toUpperCase()}:${rest ?? "/"}`;
	return dir;
}

/**
 * Whether every `git push` of the command only updates `branch`: a remote and refspecs whose
 * destination is `branch` and whose source is not empty (`:branch` deletes it), with no option that
 * widens the push. A bare `git push` does not count: where it goes depends on the current branch.
 *
 * @param {string} command
 * @param {string} branch
 */
export function isPlainPushTo(command, branch) {
	const pushes = [...stripQuotedText(command).matchAll(GIT_PUSH_ARGS)];
	if (pushes.length === 0) return false;
	return pushes.every((push) => {
		const args = (push[1] ?? "").trim().split(/\s+/).filter(Boolean);
		if (args.some((arg) => arg.startsWith("-") && !PLAIN_PUSH_OPTION.test(arg))) return false;
		const refspecs = args.filter((arg) => !arg.startsWith("-")).slice(1);
		return (
			refspecs.length > 0 &&
			refspecs.every((refspec) => {
				const [source, destination = source] = refspec.split(":");
				return source !== "" && destination === branch;
			})
		);
	});
}

/** The only push that promotes `main`: the remote `staging` that passed CI, fast-forward only. */
const MAIN_PROMOTION_REFSPEC = `origin/${RELEASE_BRANCH}:main`;

/**
 * Whether the command is exactly the promotion `git push origin origin/staging:main`, alone: it
 * moves `main` to the commit `staging` already has on the remote, so what reaches production is
 * what passed CI, and without `--force` git refuses it unless it is a fast-forward. Any option,
 * another refspec or a second push makes it something else.
 *
 * @param {string} command
 */
export function isMainPromotion(command) {
	const pushes = [...stripQuotedText(command).matchAll(GIT_PUSH_ARGS)];
	if (pushes.length !== 1) return false;
	const args = (pushes[0]?.[1] ?? "").trim().split(/\s+/).filter(Boolean);
	return args.length === 2 && args[0] === "origin" && args[1] === MAIN_PROMOTION_REFSPEC;
}

/**
 * The universal rules. The caller decides in which repos `main` is protected, because that
 * depends on its branch flow.
 *
 * @param {{ isMainProtected: (dir: string) => boolean }} options
 * @returns {CommandRule[]}
 */
export function buildCommandRules({ isMainProtected }) {
	return [
		{
			pattern: /\bgit\b[^;&|]*(--no-gpg-sign|commit\.gpgsign=false)/,
			decision: "deny",
			reason:
				"unsigned commit: commits are always signed; if the key expired, ask the user to unlock it.",
		},
		{
			pattern: new RegExp(String.raw`${GIT}add\b[^;&|]*\s(-A|--all|\.)(?=\s|$|[;&|])`),
			decision: "deny",
			reason: "git add -A or `.`: add only the change's files, by path.",
		},
		{
			pattern: new RegExp(String.raw`${GIT_PUSH}[^;&|]*(\s-f\b|--force|\s\+)`),
			decision: "deny",
			reason: "forced push: never, in any repo.",
		},
		{
			// The promotion passes: the user's approval is checked on the server (`Release gate` reads
			// the approved promotion issue), which holds even when nobody is at this terminal.
			pattern: new RegExp(String.raw`${GIT_PUSH}[^;&|]*\b(main|master)\b`),
			applies: (command, cwd) =>
				isMainProtected(resolveCommandDir(command, cwd)) && !isMainPromotion(command),
			decision: "deny",
			reason:
				`push to main: only the promotion \`git push origin ${MAIN_PROMOTION_REFSPEC}\`, ` +
				"run alone (no pipe, `&&` or `;`), once the user approved its promotion issue.",
		},
		{
			pattern: new RegExp(GIT_PUSH),
			// A main-only repo pushes to main on its own, like staging elsewhere: it is its normal flow.
			applies: (command, cwd) =>
				!isPlainPushTo(command, RELEASE_BRANCH) &&
				!isMainPromotion(command) &&
				!(!isMainProtected(resolveCommandDir(command, cwd)) && isPlainPushTo(command, "main")),
			decision: "ask",
			reason:
				`push: only \`git push origin ${RELEASE_BRANCH}\` (or \`main\` in a main-only repo) passes on its own ` +
				"(every 15 to 20 commits, then follow CI); any other push only if the user asked, since each one spends Actions minutes.",
		},
		{
			pattern: GIT_TAG_FORBIDDEN,
			decision: "deny",
			reason:
				"deleting or moving a tag rewrites a published release (if it is wrong, publish another), " +
				"and tags are never unsigned: `git tag -s <version> -m <version>`.",
		},
		{
			pattern: GIT_UNSIGNED_TAG,
			decision: "deny",
			reason: "a tag is never unsigned: `git tag -s <version> -m <version>`.",
		},
		{
			pattern: GIT_DISCARDING_WRITE,
			decision: "deny",
			reason:
				"git write that discards work for good (uncommitted changes, untracked files, a stash or " +
				"unmerged commits): commit or stash first, or suggest the command to the user. Branching, " +
				"merging, rebasing local commits and stashing pass.",
		},
		{
			pattern: GIT_PATCH,
			decision: "ask",
			reason: "applying a patch changes the tree with code nobody reviewed here: only if the user asked.",
		},
		{
			pattern: new RegExp(GIT_SOFT_RESET),
			applies: (command) =>
				new RegExp(GIT_RESET).test(stripQuotedText(command).replaceAll(new RegExp(GIT_UNSTAGE, "g"), " ")),
			decision: "ask",
			reason: "reset moving HEAD or the index: only if the user asked; `git reset -- <paths>` passes.",
		},
		{
			pattern: new RegExp(String.raw`${GIT}(?:rm|mv)\b[^;&|]*\s(?:-[a-zA-Z]*[rRf][a-zA-Z]*|--force)\b`),
			decision: "ask",
			reason: "git rm or mv recursive or forced: -r takes whole folders, -f drops uncommitted edits.",
		},
		{
			pattern: /\brobocopy\b/i,
			applies: (command) => /\/MIR\b/i.test(command) && !/\/XJ\b/i.test(command),
			decision: "deny",
			reason: "robocopy /MIR without /XJ follows junctions and empties the folder behind them: add /XJ.",
		},
		{
			pattern: /\bprettier\b[^;&|]*--write\b/,
			applies: (command) => /--write[^;&|]*(\*|\$\(|`)|xargs[^;&|]*prettier/.test(command),
			decision: "deny",
			reason:
				"prettier --write with a glob or a computed list reformats files outside the change. " +
				"Write the paths of the edited files in the command.",
		},
		{
			pattern: /\brm\s+-[a-z]*r|\bRemove-Item\b[^;&|]*-Recurse|\brmdir\s+\/s\b|\brd\s+\/s\b/i,
			applies: (command) => !TEMP_TARGET.test(command),
			decision: "ask",
			reason:
				"recursive delete outside a temp folder: work is always confirmed before deleting, and " +
				"`Remove-Item -Force` skips the recycle bin and follows junctions.",
		},
	];
}

/**
 * The first rule that matches the command, or `undefined`.
 * @param {readonly CommandRule[]} rules
 * @param {string} command
 * @param {string} cwd
 */
export function findCommandRule(rules, command, cwd) {
	const masked = stripQuotedText(command);
	return rules.find((rule) => rule.pattern.test(masked) && (rule.applies?.(command, cwd) ?? true));
}

/**
 * Reads Claude Code's call from stdin and, if a rule matches, answers with its decision.
 * @param {readonly CommandRule[]} rules
 * @param {string} label Who blocks, so the reason says which hook to edit.
 */
export async function runCommandHook(rules, label) {
	let input = "";
	for await (const chunk of process.stdin) input += String(chunk);
	/** @type {unknown} */
	let parsed;
	try {
		parsed = JSON.parse(input);
	} catch {
		return;
	}
	if (typeof parsed !== "object" || parsed === null) return;
	const event = /** @type {{ cwd?: unknown, tool_input?: { command?: unknown } }} */ (parsed);
	const command = event.tool_input?.command;
	const cwd = typeof event.cwd === "string" ? event.cwd : process.cwd();
	const rule = findCommandRule(rules, typeof command === "string" ? command : "", cwd);
	if (!rule) return;
	const decision = { hookEventName: "PreToolUse", permissionDecision: rule.decision };
	const output = { ...decision, permissionDecisionReason: `${label}: ${rule.reason}` };
	process.stdout.write(JSON.stringify({ hookSpecificOutput: output }));
}
