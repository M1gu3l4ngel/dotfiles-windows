#!/usr/bin/env node
// @ts-check
// Global PostToolUse and Stop hook: a push is not finished until its CI is green.
//
// The rule "after a push, follow the CI until green" was written and still skipped: a template
// release went out red on 2026-11-27 and nobody looked until the user did. So it is enforced:
// - PostToolUse: after a Bash or PowerShell command with `git push` of a branch, it records the
//   repository and the commit pushed, and reminds Claude to watch that run.
// - Stop: while a recorded run is queued, running or red, the turn does not end. A green run
//   leaves the record; a commit with no run after a few minutes (a repository without CI for that
//   branch) leaves it too.
//
// The record lives in the system's temp folder, one file per session. `stop_hook_active` avoids a
// loop: after three blocks in a row for the same commits, Claude may stop, and says why.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const NO_RUN_GRACE_MS = 5 * 60 * 1000;
const MAX_BLOCKS = 3;

/**
 * @typedef {{ repo: string; sha: string; pushedAt: number }} Push
 * @typedef {{ status: string; conclusion: string | null; name: string }} Run
 * @typedef {"running" | "failed" | "green" | "none"} CiState
 */

/**
 * A Git Bash path (`/d/Dev/x`) as Windows reads it (`D:/Dev/x`); any other path as is.
 * @param {string} dir
 */
export function toNativePath(dir) {
	const drive = /^\/([a-z])(\/.*)?$/i.exec(dir);
	return drive ? `${drive[1].toUpperCase()}:${drive[2] ?? "/"}` : dir;
}

/**
 * The folders where a command pushed a branch: the folder of each `git push` is the last `cd`
 * before it, or `git -C <dir>`, or the session's folder. A push of tags only starts no branch CI.
 * @param {string} command
 * @param {string} cwd
 * @returns {string[]}
 */
export function listPushDirs(command, cwd) {
	/** @type {string[]} */
	const dirs = [];
	let current = cwd;
	for (const part of command.split(/&&|;|\|\||\n/)) {
		const segment = part.trim();
		const cd = /^cd\s+("([^"]+)"|'([^']+)'|(\S+))/.exec(segment);
		if (cd) current = toNativePath(cd[2] ?? cd[3] ?? cd[4] ?? current);
		const push = /\bgit\s+(?:-C\s+("([^"]+)"|(\S+))\s+)?push\b(.*)$/.exec(segment);
		if (!push) continue;
		const args = push[4] ?? "";
		if (/--tags\b|\brefs\/tags\/|\s(v?\d+\.\d+\.\d+)\s*$/.test(args) && !/:/.test(args)) continue;
		if (/--dry-run\b|-n\b/.test(args)) continue;
		dirs.push(push[2] ?? push[3] ? toNativePath(push[2] ?? push[3] ?? "") : current);
	}
	return [...new Set(dirs)];
}

/**
 * The state of a commit's CI from its runs; `ageMs` is the time since the push.
 * @param {Run[]} runs
 * @param {number} ageMs
 * @returns {CiState}
 */
export function decideCiState(runs, ageMs) {
	if (runs.length === 0) return ageMs > NO_RUN_GRACE_MS ? "none" : "running";
	if (runs.some((run) => run.status !== "completed")) return "running";
	const failed = runs.filter((run) => !["success", "skipped", "neutral"].includes(run.conclusion ?? ""));
	return failed.length > 0 ? "failed" : "green";
}

/**
 * @typedef {{ pushes: Push[]; blocks: number }} State
 * @typedef {{ hook_event_name?: string; session_id?: string; cwd?: string; stop_hook_active?: boolean; tool_input?: { command?: unknown } }} HookInput
 */

/** @param {string | undefined} sessionId */
function getStateFile(sessionId) {
	return path.join(tmpdir(), `claude-follow-ci-${sessionId || "default"}.json`);
}

/**
 * @param {string | undefined} sessionId
 * @returns {State}
 */
function readState(sessionId) {
	const file = getStateFile(sessionId);
	if (!existsSync(file)) return { pushes: [], blocks: 0 };
	try {
		return JSON.parse(readFileSync(file, "utf8"));
	} catch {
		return { pushes: [], blocks: 0 };
	}
}

/**
 * @param {string | undefined} sessionId
 * @param {State} state
 */
function writeState(sessionId, state) {
	writeFileSync(getStateFile(sessionId), JSON.stringify(state));
}

/**
 * @param {string} file
 * @param {string[]} args
 * @param {string | undefined} cwd
 */
function runText(file, args, cwd) {
	return execFileSync(file, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

/**
 * The repository and commit a folder pushed, or null when it is not a GitHub repository.
 * @param {string} dir
 * @returns {Push | null}
 */
function findPush(dir) {
	try {
		const sha = runText("git", ["rev-parse", "HEAD"], dir);
		const repo = runText("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"], dir);
		return repo ? { repo, sha, pushedAt: Date.now() } : null;
	} catch {
		return null;
	}
}

/**
 * @param {Push} push
 * @returns {Run[]}
 */
function listRuns(push) {
	try {
		return JSON.parse(
			runText(
				"gh",
				["run", "list", "-R", push.repo, "--commit", push.sha, "--json", "status,conclusion,name"],
				undefined,
			),
		);
	} catch {
		return [];
	}
}

/** @param {HookInput} input */
function recordPushes(input) {
	const command = String(input.tool_input?.command ?? "");
	if (!/\bgit\b[^\n]*\bpush\b/.test(command)) return;
	const pushes = listPushDirs(command, input.cwd ?? process.cwd())
		.map(findPush)
		.filter(/** @returns {push is Push} */ (push) => push !== null);
	if (pushes.length === 0) return;
	const state = readState(input.session_id);
	const known = new Set(state.pushes.map((push) => `${push.repo}@${push.sha}`));
	state.pushes.push(...pushes.filter((push) => !known.has(`${push.repo}@${push.sha}`)));
	state.blocks = 0;
	writeState(input.session_id, state);
	const names = pushes.map((push) => `${push.repo}@${push.sha.slice(0, 7)}`).join(", ");
	process.stdout.write(
		JSON.stringify({
			hookSpecificOutput: {
				hookEventName: "PostToolUse",
				additionalContext: `Pushed ${names}. Follow its CI now with \`gh run watch <id> -R <repo> --exit-status\` until it is green; a red run is fixed before any other work. The turn cannot end while it runs or is red.`,
			},
		}),
	);
}

/** @param {HookInput} input */
function checkPushes(input) {
	const state = readState(input.session_id);
	if (state.pushes.length === 0) return;
	const pending = [];
	for (const push of state.pushes) {
		const ciState = decideCiState(listRuns(push), Date.now() - push.pushedAt);
		if (ciState === "running" || ciState === "failed") pending.push({ push, ciState });
	}
	state.pushes = pending.map((item) => item.push);
	if (pending.length === 0) {
		writeState(input.session_id, { pushes: [], blocks: 0 });
		return;
	}
	state.blocks = input.stop_hook_active ? state.blocks + 1 : 1;
	writeState(input.session_id, state);
	if (state.blocks > MAX_BLOCKS) return;
	const lines = pending.map(
		({ push, ciState }) =>
			`${push.repo}@${push.sha.slice(0, 7)}: ${ciState === "failed" ? "CI is red, fix it" : "CI is still running, watch it"}`,
	);
	process.stdout.write(
		JSON.stringify({
			decision: "block",
			reason: `A push is not finished until its CI is green.\n${lines.join("\n")}\nUse \`gh run watch <id> -R <repo> --exit-status\`, and \`gh run view <id> -R <repo> --log-failed\` for a red one.`,
		}),
	);
}

async function main() {
	let raw = "";
	for await (const chunk of process.stdin) raw += chunk;
	const input = JSON.parse(raw || "{}");
	if (input.hook_event_name === "Stop") checkPushes(input);
	else recordPushes(input);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
