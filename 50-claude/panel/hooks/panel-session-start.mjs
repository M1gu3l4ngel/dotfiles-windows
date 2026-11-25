#!/usr/bin/env node
// @ts-check
// Hook SessionStart: dice a Claude dónde está el panel del repo y si dice lo mismo que sus
// fuentes. Sin `.claude/panel.json` el repo no usa el panel y el hook no dice nada.
//
// Un hook no puede publicar un artefacto: eso solo lo hace Claude con su herramienta. Lo que se
// imprime entra en el contexto de la sesión; la comparación de huellas es lo que convierte un
// panel desfasado en un aviso al abrir, en vez de algo que nadie nota.

import {
	BOARD_FILES,
	BOARD_PAGE,
	GENERATE_COMMAND,
	findPublishedState,
	getConfig,
	hasPanel,
	readProjectName,
	readSourceHash,
} from "../panel-files.mjs";

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const PUBLISH = `${GENERATE_COMMAND} y publica ${BOARD_PAGE} tal cual con files ${JSON.stringify(BOARD_FILES)}`;

/** @param {string} title */
function listStatusLines(title) {
	const published = findPublishedState(projectDir);
	if (!published)
		return [
			`Panel del repo («${title}»): no consta publicado desde esta máquina.`,
			`- Búscalo con Artifact (action "list"). Si existe, republícalo en su url; si no, créalo con title «${title}» e icon "list".`,
			`- En los dos casos: ${PUBLISH}. Dile al usuario el enlace.`,
		];
	if (published.sourceHash === readSourceHash(projectDir))
		return [`Panel del repo («${title}»): ${published.url} — al día con docs/tasks.md y docs/backlog.md.`];
	return [
		`Panel del repo («${title}»): ${published.url} — DESFASADO: sus fuentes cambiaron desde la última publicación.`,
		`- Antes de seguir: ${PUBLISH}, con url ${published.url} (léelo antes si esta sesión no lo ha leído).`,
	];
}

try {
	if (hasPanel(projectDir)) {
		const lines = listStatusLines(`Panel ${readProjectName(projectDir, getConfig(projectDir))}`);
		lines.push(
			"- El panel es una vista de los .md: el estado (en curso, por probar) se cambia en docs/tasks.md y se republica; nunca se edita la página a mano.",
		);
		process.stdout.write(`${lines.join("\n")}\n`);
	}
} catch (error) {
	// Un panel.json roto se dice, pero no corta la sesión.
	process.stdout.write(`Panel del repo: no se pudo leer su configuración (${String(error)}).\n`);
}
