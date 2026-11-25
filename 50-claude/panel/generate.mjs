#!/usr/bin/env node
// @ts-check
// Generates the repo's panel in `.claude/artifacts/`: the data (`tasks.json`, from `docs/tasks.md`,
// `docs/backlog.md` and `.claude/panel.json`), the page and its theme. Claude then publishes the
// page with those two files next to it.
//
// It refuses if the sources have problems: a half-generated panel would silently say less than
// the repo, which is exactly the drift this command exists to prevent.
//
// Usage, at the repo root: node ~/.claude/panel/generate.mjs

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildBoardData, listBoardProblems } from "./board.mjs";
import {
	BACKLOG_FILE,
	BOARD_DATA,
	BOARD_FILES,
	BOARD_PAGE,
	BOARD_THEME,
	CONFIG_FILE,
	OUTPUT_DIR,
	PAGE_TEMPLATE,
	TASKS_FILE,
	THEME_TEMPLATE,
	getConfig,
	hasPanel,
	readProjectName,
	readSource,
	readSourceHash,
} from "./panel-files.mjs";

/** @param {string} text */
const escapeHtml = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/**
 * @param {string} root
 * @param {string} rel
 * @param {string} content
 */
function writeOutput(root, rel, content) {
	const file = path.join(root, rel);
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, content, "utf8");
}

function main() {
	const root = process.cwd();
	if (!hasPanel(root)) {
		console.error(`✗ This repo has no ${CONFIG_FILE}. Create it with: node ~/.claude/panel/init.mjs`);
		process.exit(1);
	}
	const config = getConfig(root);
	const labels = { platforms: config.platforms, devices: config.devices };
	const sources = { tasks: readSource(root, TASKS_FILE), backlog: readSource(root, BACKLOG_FILE) };

	const problems = listBoardProblems(sources, labels);
	if (problems.length > 0) {
		for (const problem of problems) console.error(`✗ ${problem.file}:${problem.line} ${problem.message}`);
		console.error(`\n${problems.length} problem(s) in the panel sources: fix them and generate again.`);
		process.exit(1);
	}

	const project = readProjectName(root, config);
	const data = buildBoardData({ ...sources, project, sourceHash: readSourceHash(root), labels });
	writeOutput(root, BOARD_DATA, `${JSON.stringify(data, null, "\t")}\n`);
	const page = readFileSync(PAGE_TEMPLATE, "utf8").replace("<title>Panel</title>", `<title>Panel ${escapeHtml(project)}</title>`);
	writeOutput(root, BOARD_PAGE, page);
	writeOutput(root, BOARD_THEME, readFileSync(THEME_TEMPLATE, "utf8"));
	// Generated and machine-local files are not versioned: the folder ignores itself.
	writeOutput(root, `${OUTPUT_DIR}/.gitignore`, "*\n");

	const itemCount = data.groups.reduce((sum, group) => sum + group.items.length, 0);
	console.log(`✓ Panel ${project}: ${data.groups.length} block(s), ${itemCount} task(s)`);
	console.log(`→ Publish ${BOARD_PAGE} with files ${JSON.stringify(BOARD_FILES)}`);
}

main();
