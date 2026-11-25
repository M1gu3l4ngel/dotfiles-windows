#!/usr/bin/env node
// @ts-check
// PostToolUse hook (Artifact): when the panel is published, stores its URL and the published
// fingerprint.
//
// It is the other half of the comparison `panel-session-start.mjs` makes: without knowing which
// fingerprint was published, a new session cannot tell whether the panel still matches its
// sources. If it was published with stale data (not regenerated), it says so right away.

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
		// Without its data in this publish, the artifact keeps the files it had: their fingerprint is
		// unknown, so it is stored empty and the next session start reports the panel as outdated.
		writePublishedState(projectDir, { url, sourceHash: sentData ? (publishedHash ?? "") : "" });

		if (!sentData) reply(`Panel published without all its files: publish it again with files ${JSON.stringify(BOARD_FILES)}.`);
		else if (publishedHash !== readSourceHash(projectDir))
			reply(`Panel published with stale data: its sources changed after it was generated. Run ${GENERATE_COMMAND} and republish.`);
	} catch {
		// A broken hook must not stop the session; at worst, the next session start reports drift.
	}
});
