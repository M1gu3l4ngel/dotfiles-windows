#!/usr/bin/env node
// @ts-check
// Hook PostToolUse (Edit|Write): al cambiar una fuente del panel (`docs/tasks.md`,
// `docs/backlog.md` o `.claude/panel.json`), recuerda que el panel publicado ya no dice lo mismo.
// El aviso llega en el momento del cambio, no al abrir la próxima sesión, cuando el desfase ya
// ha durado horas.

import path from "node:path";
import { EDITED_SOURCES, GENERATE_COMMAND, findPublishedState, hasPanel } from "../panel-files.mjs";

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
	raw += chunk;
});
process.stdin.on("end", () => {
	try {
		const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
		if (!hasPanel(projectDir)) return;
		const filePath = JSON.parse(raw).tool_input?.file_path;
		if (typeof filePath !== "string") return;
		const relative = path.relative(projectDir, filePath).replaceAll("\\", "/");
		if (!EDITED_SOURCES.includes(relative)) return;

		const url = findPublishedState(projectDir)?.url;
		const target = url ? `republícalo en ${url}` : "publícalo";
		process.stdout.write(
			JSON.stringify({
				hookSpecificOutput: {
					hookEventName: "PostToolUse",
					additionalContext: `${relative} cambió: el panel queda desfasado. Al terminar los cambios de este bloque, ${GENERATE_COMMAND} y ${target}.`,
				},
			}),
		);
	} catch {
		// Un hook roto no debe cortar la sesión.
	}
});
