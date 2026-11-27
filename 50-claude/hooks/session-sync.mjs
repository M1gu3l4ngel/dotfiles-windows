#!/usr/bin/env node
// @ts-check
// SessionStart hook: puts the repo and the company brain next to it (`../brain`) at their remote's
// commit, and reports in red what would stop the work: a clone that could not be updated, commits
// that are due to be pushed, and the last CI run of a workflow that failed.
//
// Agents read from disk, never from GitHub, and nothing else pulls: the sync PRs merged into the
// brain left its local copy behind without anyone noticing. A fast-forward of a clean tree cannot
// lose work; anything else is only reported, for the session to settle before it starts.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Commits waiting to be pushed from which the push is due (the grouping rule: 15 to 20). */
export const PUSH_DUE_AT = 15;

const RED = "\u001b[31m";
const GREEN = "\u001b[32m";
const RESET = "\u001b[0m";

/**
 * What to do with a clone, from its state against its upstream.
 * @param {{ behind: number, ahead: number, dirty: boolean }} state
 * @returns {"none" | "fast-forward" | "report"}
 */
export function decideSync({ behind, ahead, dirty }) {
	if (behind === 0) return "none";
	if (ahead === 0 && !dirty) return "fast-forward";
	return "report";
}

/**
 * The brain clone next to a project, or null when the project has none or is the brain itself.
 * @param {string} projectDir
 */
export function findBrainDir(projectDir) {
	const brainDir = path.resolve(projectDir, "..", "brain");
	if (path.resolve(projectDir) === brainDir) return null;
	return existsSync(path.join(brainDir, ".git")) ? brainDir : null;
}

/**
 * The workflows whose last finished run failed, from `gh run list` rows (newest first).
 * @param {{ workflowName: string, status: string, conclusion: string, url: string }[]} runs
 */
export function listFailedWorkflows(runs) {
	/** @type {Map<string, { workflowName: string, conclusion: string, url: string }>} */
	const latest = new Map();
	for (const run of runs) {
		if (run.status !== "completed" || latest.has(run.workflowName)) continue;
		latest.set(run.workflowName, run);
	}
	return [...latest.values()].filter((run) => !["success", "skipped", "neutral"].includes(run.conclusion));
}

/** @param {string} cwd @param {string} command @param {string[]} args */
const run = (cwd, command, args) =>
	execFileSync(command, args, { cwd, encoding: "utf8", timeout: 20_000, stdio: ["ignore", "pipe", "pipe"] }).trim();

/**
 * Brings one clone to its remote's commit when nothing can be lost, and says what it did.
 * @param {string} label @param {string} dir @param {string[]} lines
 * @returns {{ ahead: number, branch: string } | null}
 */
function syncClone(label, dir, lines) {
	try {
		run(dir, "git", ["fetch", "--quiet", "origin"]);
		const branch = run(dir, "git", ["rev-parse", "--abbrev-ref", "HEAD"]);
		const [ahead, behind] = run(dir, "git", ["rev-list", "--left-right", "--count", "HEAD...@{upstream}"]).split(/\s+/).map(Number);
		const dirty = run(dir, "git", ["status", "--porcelain"]) !== "";
		const action = decideSync({ behind, ahead, dirty });
		if (action === "fast-forward") {
			run(dir, "git", ["merge", "--ff-only", "--quiet", "@{upstream}"]);
			lines.push(`${GREEN}${label} (${branch}): updated ${behind} commit(s) from its remote.${RESET}`);
			return { ahead: 0, branch };
		}
		if (action === "report")
			lines.push(
				`${RED}${label} (${branch}): ${behind} commit(s) behind its remote and ${dirty ? "with local changes" : `${ahead} local commit(s) ahead`}, so it was not updated. ` +
					`Settle it first (pull --rebase --autostash, or ask the user): what is on disk is old.${RESET}`,
			);
		return { ahead, branch };
	} catch (error) {
		const reason = error instanceof Error ? error.message.split("\n")[0] : String(error);
		lines.push(`${RED}${label}: could not compare it with its remote (${reason}); it may be old.${RESET}`);
		return null;
	}
}

/** @param {string} projectDir @param {string} branch @param {string[]} lines */
function reportFailedRuns(projectDir, branch, lines) {
	try {
		const fields = "workflowName,status,conclusion,url";
		const onBranch = JSON.parse(run(projectDir, "gh", ["run", "list", "--branch", branch, "--limit", "30", "--json", fields]));
		const scheduled = JSON.parse(run(projectDir, "gh", ["run", "list", "--event", "schedule", "--limit", "10", "--json", fields]));
		for (const failed of listFailedWorkflows([...onBranch, ...scheduled]))
			lines.push(`${RED}CI: the last "${failed.workflowName}" run ended ${failed.conclusion} (${failed.url}). Fix it before the day's task.${RESET}`);
	} catch {
		// Without gh, a GitHub remote or a network, there is nothing to report; the push shows it later.
	}
}

function main() {
	const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
	/** @type {string[]} */
	const lines = [];
	if (existsSync(path.join(projectDir, ".git"))) {
		const repo = syncClone("Repo", projectDir, lines);
		if (repo && repo.ahead >= PUSH_DUE_AT)
			lines.push(`${RED}Repo (${repo.branch}): ${repo.ahead} commits not pushed; the push is due (groups of 15 to 20).${RESET}`);
		if (repo) reportFailedRuns(projectDir, repo.branch, lines);
	}
	const brainDir = findBrainDir(projectDir);
	if (brainDir) syncClone("Brain", brainDir, lines);
	if (lines.length > 0) console.log(lines.join("\n"));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
