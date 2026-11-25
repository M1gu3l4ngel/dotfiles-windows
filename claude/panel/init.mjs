#!/usr/bin/env node
// @ts-check
// Prepara un repo para usar el panel: crea `.claude/panel.json`, `docs/tasks.md` y
// `docs/backlog.md` si faltan. Nunca pisa uno que ya exista. Las plataformas y los dispositivos
// se rellenan después a mano en `panel.json`: id → nombre que se escribe en los `.md`.
//
// Uso, en la raíz del repo: node ~/.claude/panel/init.mjs

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
		console.log(`- ${rel} ya existe: no se toca.`);
		continue;
	}
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, content, "utf8");
	console.log(`✓ ${rel} creado.`);
}
console.log("→ Pon las plataformas y los dispositivos del repo en .claude/panel.json y genera con: node ~/.claude/panel/generate.mjs");
