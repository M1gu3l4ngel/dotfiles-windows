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

// `add`, `commit`, `rm` and `mv` are missing on purpose: Claude runs them on its own changes and
// git keeps every version (a recursive or forced rm/mv asks). The rest belongs to the user.
const WRITE_SUBCOMMANDS = "pull|reset|rebase|merge|checkout|switch|restore|clean|stash|cherry-pick|revert|tag|apply|am";
const GIT_WRITE = new RegExp(String.raw`${GIT}(${WRITE_SUBCOMMANDS})\b`);

// The read-only forms of those subcommands (listing and verifying tags, viewing the stash). They
// are removed from the command and the rest is searched again: `git tag -l; git reset` blocks.
const TAG_READ_OPTIONS = String.raw`-l|--list|-v|--verify|-n\d*|--contains|--points-at|--sort=\S+|--format=\S+`;
const READ_ONLY = String.raw`${GIT}(?:tag(?:\s+(?:${TAG_READ_OPTIONS})\b[^;&|]*)?\s*(?:$|[;&|])|stash\s+(?:list|show)\b)`;
const GIT_READ_ONLY = new RegExp(READ_ONLY, "g");

// A release's signed tag closes it, the way a signed commit closes a change: Claude creates it,
// so it is removed from the command like a read. Deleting, moving or creating it unsigned is not.
const GIT_TAG = String.raw`${GIT}tag\b`;
const GIT_TAG_FORBIDDEN = new RegExp(
	String.raw`${GIT_TAG}[^;&|]*\s(?:-d|--delete|-f|--force|--no-sign)\b`,
);
const GIT_SIGNED_TAG = new RegExp(String.raw`${GIT_TAG}(?=[^;&|]*\s(?:-s|--sign)\b)[^;&|]*`, "g");

// A fast-forward pull loses no work and rewrites no history, so it asks instead of denying (a
// read-only clone needs it). Any option that merges, rebases or forces keeps it a write.
const MERGING_PULL_OPTIONS = String.raw`-r|--rebase\S*|--no-ff|--squash|-f|--force`;
const FF_PULL = String.raw`${GIT}pull\b(?=[^;&|]*\s--ff-only\b)(?![^;&|]*\s(?:${MERGING_PULL_OPTIONS})\b)[^;&|]*`;
const GIT_FF_PULL = new RegExp(FF_PULL, "g");

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
	return path.resolve(cwd, match[1].replaceAll(/^["']|["']$/g, ""));
}

/**
 * Whether every `git push` of the command only updates the release branch: a remote and one or
 * more refspecs whose destination is `staging` and whose source is not empty (`:staging` deletes
 * it). A bare `git push` does not count: where it goes depends on the current branch.
 *
 * @param {string} command
 */
export function isReleaseBranchPush(command) {
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
				return source !== "" && destination === RELEASE_BRANCH;
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
			pattern: new RegExp(String.raw`${GIT_PUSH}[^;&|]*\b(main|master)\b`),
			applies: (command, cwd) =>
				isMainProtected(resolveCommandDir(command, cwd)) && isMainPromotion(command),
			decision: "ask",
			reason:
				`promotion to main: only when the user orders it, after CI is green on ${RELEASE_BRANCH}; ` +
				"the user approves it here. Then `git fetch origin main:main` and follow Release gate.",
		},
		{
			pattern: new RegExp(String.raw`${GIT_PUSH}[^;&|]*\b(main|master)\b`),
			applies: (command, cwd) => isMainProtected(resolveCommandDir(command, cwd)),
			decision: "deny",
			reason:
				`push to main: only the promotion \`git push origin ${MAIN_PROMOTION_REFSPEC}\`, ` +
				"alone, when the user orders it.",
		},
		{
			pattern: new RegExp(GIT_PUSH),
			applies: (command) => !isReleaseBranchPush(command),
			decision: "ask",
			reason:
				`push: only \`git push origin ${RELEASE_BRANCH}\` passes on its own (every 15 to 20 commits, ` +
				"then follow CI); any other push only if the user asked, since each one spends Actions minutes.",
		},
		{
			pattern: GIT_TAG_FORBIDDEN,
			decision: "deny",
			reason:
				"deleting or moving a tag rewrites a published release (if it is wrong, publish another), " +
				"and tags are never unsigned: `git tag -s <version> -m <version>`.",
		},
		{
			pattern: GIT_WRITE,
			applies: (command) =>
				GIT_WRITE.test(
					stripQuotedText(command)
						.replaceAll(GIT_READ_ONLY, " ")
						.replaceAll(GIT_SIGNED_TAG, " ")
						.replaceAll(GIT_FF_PULL, " ")
						.replaceAll(new RegExp(GIT_SOFT_RESET, "g"), " "),
				),
			decision: "deny",
			reason:
				"git write: whatever rewrites history or the tree is the user's. Suggest the command; " +
				"status, log, diff and show are fine.",
		},
		{
			pattern: new RegExp(FF_PULL),
			decision: "ask",
			reason: "fast-forward pull: it changes the working tree; only if the user expects it.",
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
