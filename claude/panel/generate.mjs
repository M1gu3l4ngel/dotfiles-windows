#!/usr/bin/env node
// @ts-check
// Genera el panel del repo en `.claude/artifacts/`: los datos (`tasks.json`, de `docs/tasks.md`,
// `docs/backlog.md` y `.claude/panel.json`), la página y su tema. Después, Claude publica la
// página con esos dos archivos al lado.
//
// Se niega si las fuentes tienen problemas: un panel generado a medias diría menos que el repo
// sin avisar, que es justo el desfase que este comando existe para evitar.
//
// Uso, en la raíz del repo: node ~/.claude/panel/generate.mjs

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
		console.error(`✗ Este repo no tiene ${CONFIG_FILE}. Créalo con: node ~/.claude/panel/init.mjs`);
		process.exit(1);
	}
	const config = getConfig(root);
	const labels = { platforms: config.platforms, devices: config.devices };
	const sources = { tasks: readSource(root, TASKS_FILE), backlog: readSource(root, BACKLOG_FILE) };

	const problems = listBoardProblems(sources, labels);
	if (problems.length > 0) {
		for (const problem of problems) console.error(`✗ ${problem.file}:${problem.line} ${problem.message}`);
		console.error(`\n${problems.length} problema(s) en las fuentes del panel: arréglalos y vuelve a generar.`);
		process.exit(1);
	}

	const project = readProjectName(root, config);
	const data = buildBoardData({ ...sources, project, sourceHash: readSourceHash(root), labels });
	writeOutput(root, BOARD_DATA, `${JSON.stringify(data, null, "\t")}\n`);
	const page = readFileSync(PAGE_TEMPLATE, "utf8").replace("<title>Panel</title>", `<title>Panel ${escapeHtml(project)}</title>`);
	writeOutput(root, BOARD_PAGE, page);
	writeOutput(root, BOARD_THEME, readFileSync(THEME_TEMPLATE, "utf8"));
	// Lo generado y lo de esta máquina no se versiona: la carpeta se ignora a sí misma.
	writeOutput(root, `${OUTPUT_DIR}/.gitignore`, "*\n");

	const itemCount = data.groups.reduce((sum, group) => sum + group.items.length, 0);
	console.log(`✓ Panel ${project}: ${data.groups.length} bloque(s), ${itemCount} tarea(s)`);
	console.log(`→ Publica ${BOARD_PAGE} con files ${JSON.stringify(BOARD_FILES)}`);
}

main();
