#!/usr/bin/env node
// @ts-check
// Comprueba que `docs/tasks.md` y `docs/backlog.md` siguen el formato del panel, sin generar
// nada. Sale con 1 si hay problemas; un repo sin `.claude/panel.json` no tiene panel y pasa.
// Sirve para el check de cada repo y para su CI.
//
// Uso, en la raíz del repo: node ~/.claude/panel/check.mjs [carpeta del repo]

import path from "node:path";
import { listBoardProblems } from "./board.mjs";
import { BACKLOG_FILE, CONFIG_FILE, TASKS_FILE, getConfig, hasPanel, readSource } from "./panel-files.mjs";

const root = path.resolve(process.argv[2] ?? process.cwd());
if (!hasPanel(root)) {
	console.log(`- Sin ${CONFIG_FILE}: este repo no usa el panel.`);
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
console.log(`✓ ${TASKS_FILE} y ${BACKLOG_FILE} siguen el formato del panel.`);
