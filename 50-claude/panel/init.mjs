#!/usr/bin/env node
// @ts-check
// Prepares a repo for the panel: creates `.claude/panel.json`, `docs/tasks.md` and
// `docs/backlog.md` if they are missing, and never overwrites an existing one. Platforms and
// devices are filled in by hand afterwards in `panel.json`: id → name written in the `.md` files.
// The two `.md` files start in Spanish, the language the panel reads.
//
// Usage, at the repo root: node ~/.claude/panel/init.mjs

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BACKLOG_FILE, CONFIG_FILE, TASKS_FILE } from "./panel-files.mjs";

const root = process.cwd();
const project = path.basename(root);

const FILES = {
	[CONFIG_FILE]: `${JSON.stringify({ project, platforms: {}, devices: {} }, null, "\t")}\n`,
	[TASKS_FILE]: `# Tareas pendientes — ${project}\n\nSolo lo que falta: lo hecho se borra, no se marca. El formato lo describe el README de \`~/.claude/panel/\`.\n`,
	[BACKLOG_FILE]: `# Backlog — ${project}\n\nLo diferido que no bloquea nada, con su porqué y el archivo concreto.\n`,
};

for (const [rel, content] of Object.entries(FILES)) {
	const file = path.join(root, rel);
	if (existsSync(file)) {
		console.log(`- ${rel} already exists: left untouched.`);
		continue;
	}
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, content, "utf8");
	console.log(`✓ ${rel} created.`);
}
console.log("→ Put the repo's platforms and devices in .claude/panel.json and generate with: node ~/.claude/panel/generate.mjs");
