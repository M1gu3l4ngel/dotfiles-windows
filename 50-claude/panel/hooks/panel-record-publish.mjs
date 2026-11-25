#!/usr/bin/env node
// @ts-check
// Hook PostToolUse (Artifact): al publicar el panel, guarda su URL y la huella de lo publicado.
//
// Es la otra mitad de la comparación que hace `panel-session-start.mjs`: sin saber qué huella se
// publicó, no hay forma de decir al abrir sesión si el panel sigue diciendo lo mismo que sus
// fuentes. Si se publicó con datos viejos (sin regenerar), lo dice en el momento.

import { BOARD_FILES, BOARD_PAGE, GENERATE_COMMAND, findBoardDataHash, hasPanel, readSourceHash, writePublishedState } from "../panel-files.mjs";

const ARTIFACT_URL_RE = /https:\/\/claude\.ai\/(?:code\/)?artifact\/[\w-]+/;

/** @param {string} text */
function reply(text) {
	process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: text } }));
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
	raw += chunk;
});
process.stdin.on("end", () => {
	try {
		const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
		if (!hasPanel(projectDir)) return;
		const event = JSON.parse(raw);
		const input = event.tool_input ?? {};
		const action = input.action ?? "publish";
		const filePath = typeof input.file_path === "string" ? input.file_path.replaceAll("\\", "/") : "";
		if (action !== "publish" || input.asset || !filePath.endsWith(BOARD_PAGE)) return;

		const url = (typeof input.url === "string" && input.url) || ARTIFACT_URL_RE.exec(JSON.stringify(event.tool_response ?? ""))?.[0];
		if (!url) return;

		const publishedHash = findBoardDataHash(projectDir);
		const sent = JSON.stringify(input.files ?? {});
		const sentData = Object.keys(BOARD_FILES).every((name) => sent.includes(name));
		// Sin sus datos en esta publicación quedan los que ya tenía el artefacto: no se puede saber
		// su huella, así que se guarda vacía y el próximo arranque lo da por desfasado.
		writePublishedState(projectDir, { url, sourceHash: sentData ? (publishedHash ?? "") : "" });

		if (!sentData) reply(`Panel publicado sin todos sus archivos: vuelve a publicarlo con files ${JSON.stringify(BOARD_FILES)}.`);
		else if (publishedHash !== readSourceHash(projectDir))
			reply(`Panel publicado con datos viejos: sus fuentes cambiaron después de generarlos. Corre ${GENERATE_COMMAND} y republica.`);
	} catch {
		// Un hook roto no debe cortar la sesión; en el peor caso el próximo arranque avisa de desfase.
	}
});
