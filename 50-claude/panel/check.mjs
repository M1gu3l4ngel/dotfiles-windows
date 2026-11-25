#!/usr/bin/env node
// @ts-check
// Checks that `docs/tasks.md` and `docs/backlog.md` follow the panel format, without generating
// anything. Exits with 1 on problems; a repo without `.claude/panel.json` has no panel and passes.
// Used by each repo's check and its CI.
//
// Usage, at the repo root: node ~/.claude/panel/check.mjs [repo folder]

import path from "node:path";
import { listBoardProblems } from "./board.mjs";
import { BACKLOG_FILE, CONFIG_FILE, TASKS_FILE, getConfig, hasPanel, readSource } from "./panel-files.mjs";

const root = path.resolve(process.argv[2] ?? process.cwd());
if (!hasPanel(root)) {
	console.log(`- No ${CONFIG_FILE}: this repo does not use the panel.`);
	process.exit(0);
}
const config = getConfig(root);
const problems = listBoardProblems(
	{ tasks: readSource(root, TASKS_FILE), backlog: readSource(root, BACKLOG_FILE) },
	{ platforms: config.platforms, devices: config.devices },
);
if (problems.length > 0) {
	for (const problem of problems) console.error(`✗ ${problem.file}:${problem.line} ${problem.message}`);
	process.exit(1);
}
console.log(`✓ ${TASKS_FILE} and ${BACKLOG_FILE} follow the panel format.`);
