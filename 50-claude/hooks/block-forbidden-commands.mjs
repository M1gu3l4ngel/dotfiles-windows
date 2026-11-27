#!/usr/bin/env node
// @ts-check
// Global PreToolUse hook for Bash and PowerShell: stops the commands ~/.claude/CLAUDE.md forbids.
//
// CLAUDE.md already states these rules, but an instruction is only guidance: a long session, a
// subagent or auto mode can forget it. A hook always runs, also inside a subagent. The rules live
// in `command-rules.mjs`, the single source each project copies; this file only adds what is
// specific to the global hook: in which repos `main` is protected.
//
// Runs the same on Windows and Linux; only this file's path in settings.json changes per machine.

import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCommandRules, findCommandRule, runCommandHook } from "./command-rules.mjs";
import { OUTWARD_RULES } from "./outward-rules.mjs";

// Repos whose only branch is main (no staging, no CI spending minutes): pushing to main is their
// normal flow. They are each user's own, so the list lives outside the public repo, in
// ~/.claude/hooks.local.json (`{ "mainOnlyRepos": ["owner/repo"] }`, see
// 50-claude/hooks.local.example.json). They are matched by remote URL, not by folder, which
// changes from one machine to another. Without the file, no repo has the exception.
const LOCAL_CONFIG = path.join(os.homedir(), ".claude", "hooks.local.json");

/** @returns {string[]} */
function readMainOnlyRepos() {
	try {
		const repos = JSON.parse(readFileSync(LOCAL_CONFIG, "utf8")).mainOnlyRepos;
		return Array.isArray(repos) ? repos.filter((repo) => typeof repo === "string") : [];
	} catch {
		return [];
	}
}

/** @param {string} text */
function escapeRegExp(text) {
	return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/** @param {string} dir */
function isMainOnlyRepo(dir) {
	const repos = readMainOnlyRepos();
	if (repos.length === 0) return false;
	try {
		const url = execFileSync("git", ["-C", dir, "remote", "get-url", "origin"], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		})
			.trim()
			.toLowerCase();
		return repos.some((repo) =>
			new RegExp(`[/:]${escapeRegExp(repo.toLowerCase())}(?:\\.git)?$`).test(url),
		);
	} catch {
		return false;
	}
}

const RULES = [...buildCommandRules({ isMainProtected: (dir) => !isMainOnlyRepo(dir) }), ...OUTWARD_RULES];

/**
 * @param {string} command
 * @param {string} cwd
 */
export function findRule(command, cwd) {
	return findCommandRule(RULES, command, cwd);
}

// Read stdin only when run as the hook, not when the tests import it. Compare real paths, because
// `~/.claude/hooks` links here.
const invokedPath = process.argv[1] ? realpathSync(process.argv[1]) : "";
if (invokedPath === realpathSync(fileURLToPath(import.meta.url))) {
	await runCommandHook(RULES, "~/.claude/hooks/block-forbidden-commands.mjs");
}
