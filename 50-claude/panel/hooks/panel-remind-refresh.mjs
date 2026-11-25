#!/usr/bin/env node
// @ts-check
// PostToolUse hook (Edit|Write): when a panel source changes (`docs/tasks.md`, `docs/backlog.md`
// or `.claude/panel.json`), reminds Claude that the published panel no longer matches. The
// reminder comes at the moment of the change, not at the next session start, when the drift has
// already lasted hours.

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
		const target = url ? `republish it at ${url}` : "publish it";
		process.stdout.write(
			JSON.stringify({
				hookSpecificOutput: {
					hookEventName: "PostToolUse",
					additionalContext: `${relative} changed: the panel is now outdated. When this block's changes are done, run ${GENERATE_COMMAND} and ${target}.`,
				},
			}),
		);
	} catch {
		// A broken hook must not stop the session.
	}
});
