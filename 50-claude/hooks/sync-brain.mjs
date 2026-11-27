#!/usr/bin/env node
// @ts-check
// SessionStart hook: keeps the company brain cloned next to the repo (`../brain`) at the same commit
// as its remote, so no agent reads an old copy of it.
//
// Agents read the brain from disk, never from GitHub, and nothing else pulls it: the sync PRs that
// Core's automation merges there left the local copy behind without anyone noticing. A fast-forward
// with a clean tree cannot lose work; anything else is only reported, for the session to settle.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * What to do with the brain clone, from its state against its upstream.
 * @param {{ behind: number, ahead: number, dirty: boolean }} state
 * @returns {"none" | "fast-forward" | "report"}
 */
export function decideBrainSync({ behind, ahead, dirty }) {
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

/** @param {string} brainDir @param {string[]} args */
const git = (brainDir, args) =>
	execFileSync("git", ["-C", brainDir, ...args], { encoding: "utf8", timeout: 15_000, stdio: ["ignore", "pipe", "pipe"] }).trim();

function main() {
	const brainDir = findBrainDir(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
	if (!brainDir) return;
	try {
		git(brainDir, ["fetch", "--quiet", "origin"]);
		const [ahead, behind] = git(brainDir, ["rev-list", "--left-right", "--count", "HEAD...@{upstream}"]).split(/\s+/).map(Number);
		const dirty = git(brainDir, ["status", "--porcelain"]) !== "";
		const action = decideBrainSync({ behind, ahead, dirty });
		if (action === "fast-forward") {
			git(brainDir, ["merge", "--ff-only", "--quiet", "@{upstream}"]);
			console.log(`Brain (${brainDir}): updated ${behind} commit(s) to its remote; it is current.`);
		} else if (action === "report") {
			console.log(
				`Brain (${brainDir}): ${behind} commit(s) behind its remote and ${dirty ? "with local changes" : `${ahead} local commit(s) ahead`}, so it was not updated. ` +
					"Settle it (commit and pull --rebase, or ask the user) before reading the brain: what is on disk is old.",
			);
		}
	} catch (error) {
		const reason = error instanceof Error ? error.message.split("\n")[0] : String(error);
		console.log(`Brain (${brainDir}): could not compare it with its remote (${reason}); it may be old. Check it before relying on it.`);
	}
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
