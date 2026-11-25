#!/usr/bin/env node
// @ts-check
// SessionStart hook: tells Claude where the repo's panel is and whether it matches its sources.
// Without `.claude/panel.json` the repo does not use the panel and the hook says nothing.
//
// A hook cannot publish an artifact: only Claude can, with its tool. What it prints enters the
// session context; comparing fingerprints is what turns an outdated panel into a warning at
// session start, instead of something nobody notices.

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
const PUBLISH = `${GENERATE_COMMAND} and publish ${BOARD_PAGE} as is with files ${JSON.stringify(BOARD_FILES)}`;

/** @param {string} title */
function listStatusLines(title) {
	const published = findPublishedState(projectDir);
	if (!published)
		return [
			`Repo panel («${title}»): no publish recorded from this machine.`,
			`- Look for it with Artifact (action "list"). If it exists, republish to its url; if not, create it with title «${title}» and icon "list".`,
			`- Either way: ${PUBLISH}. Give the user the link.`,
		];
	if (published.sourceHash === readSourceHash(projectDir))
		return [`Repo panel («${title}»): ${published.url} — up to date with docs/tasks.md and docs/backlog.md.`];
	return [
		`Repo panel («${title}»): ${published.url} — OUTDATED: its sources changed since the last publish.`,
		`- Before continuing: ${PUBLISH}, with url ${published.url} (read it first if this session has not).`,
	];
}

try {
	if (hasPanel(projectDir)) {
		const lines = listStatusLines(`Panel ${readProjectName(projectDir, getConfig(projectDir))}`);
		lines.push(
			"- The panel is a view of the .md files: state (en curso, por probar) is changed in docs/tasks.md and republished; the page is never edited by hand.",
		);
		process.stdout.write(`${lines.join("\n")}\n`);
	}
} catch (error) {
	// A broken panel.json is reported, but does not stop the session.
	process.stdout.write(`Repo panel: could not read its configuration (${String(error)}).\n`);
}
