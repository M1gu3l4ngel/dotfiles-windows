// @ts-check
// What the panel commands (`generate`, `check`, `init`) and their hooks share: where each file
// lives in the repo, the panel's configuration and the fingerprint of its sources.
//
// The fingerprint makes silent drift impossible: `generate` writes it into the data, the publish
// hook stores the published one, and a new session compares it with the current sources. It lives
// in one module so that the commands and the hooks cannot compute it differently.
//
// A repo uses the panel if it has `.claude/panel.json`. Without that file, the hooks do nothing.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CONFIG_FILE = ".claude/panel.json";
export const TASKS_FILE = "docs/tasks.md";
export const BACKLOG_FILE = "docs/backlog.md";
/** Generated and machine-local files: the folder ignores itself with its own `.gitignore`. */
export const OUTPUT_DIR = ".claude/artifacts";
export const BOARD_PAGE = `${OUTPUT_DIR}/project-board.html`;
export const BOARD_DATA = `${OUTPUT_DIR}/tasks.json`;
/** URL and fingerprint of the last publish from this machine. */
export const PUBLISHED_STATE = `${OUTPUT_DIR}/published.json`;
export const BOARD_THEME = `${OUTPUT_DIR}/panel-theme.css`;
/** What is published next to the page, by its published name. */
export const BOARD_FILES = { "tasks.json": BOARD_DATA, "panel-theme.css": BOARD_THEME };

const PANEL_DIR = path.dirname(fileURLToPath(import.meta.url));
/** The panel's fixed page and theme, next to this module (`~/.claude/panel/`, linked to the dotfiles repo). */
export const PAGE_TEMPLATE = path.join(PANEL_DIR, "board.html");
export const THEME_TEMPLATE = path.join(PANEL_DIR, "panel-theme.css");

/**
 * @typedef {object} PanelConfig
 * @property {string | null} project Panel name; without it, the `package.json` name or the folder.
 * @property {Record<string, string>} platforms id → display name, the one written after `**Plataforma:**`.
 * @property {Record<string, string>} devices id → display name, the one in the «Por probar» checkboxes.
 */

/** @param {string} projectDir */
export function hasPanel(projectDir) {
	return existsSync(path.join(projectDir, CONFIG_FILE));
}

/** @param {unknown} value */
function toLabels(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return Object.fromEntries(Object.entries(value).filter(([, label]) => typeof label === "string"));
}

/**
 * The repo's panel configuration. Throws if the file is missing or is not JSON: without it the
 * valid platforms are unknown, and a panel that guessed them would say less than the repo.
 * @param {string} projectDir
 * @returns {PanelConfig}
 */
export function getConfig(projectDir) {
	const raw = JSON.parse(readFileSync(path.join(projectDir, CONFIG_FILE), "utf8"));
	return {
		project: typeof raw.project === "string" && raw.project ? raw.project : null,
		platforms: toLabels(raw.platforms),
		devices: toLabels(raw.devices),
	};
}

/**
 * The panel name: the one in `panel.json`, the `package.json` `name`, or the folder.
 * @param {string} projectDir
 * @param {PanelConfig} config
 */
export function readProjectName(projectDir, config) {
	if (config.project) return config.project;
	try {
		const { name } = JSON.parse(readFileSync(path.join(projectDir, "package.json"), "utf8"));
		if (typeof name === "string" && name) return name;
	} catch {
		// Without a readable `package.json`, the folder name remains.
	}
	return path.basename(projectDir);
}

/**
 * A source as it is on disk; a missing one counts as empty.
 * @param {string} projectDir
 * @param {string} rel
 */
export function readSource(projectDir, rel) {
	const file = path.isAbsolute(rel) ? rel : path.join(projectDir, rel);
	return existsSync(file) ? readFileSync(file, "utf8") : "";
}

/** The fingerprint's sources. The page and its theme count too: if they change, the published panel is outdated. */
export const HASH_SOURCES = [TASKS_FILE, BACKLOG_FILE, CONFIG_FILE, PAGE_TEMPLATE, THEME_TEMPLATE];

/** The sources edited in the repo: changing them leaves the panel outdated. */
export const EDITED_SOURCES = [TASKS_FILE, BACKLOG_FILE, CONFIG_FILE];

/**
 * Fingerprint of the sources, regardless of line endings (CRLF on Windows, LF in CI).
 * @param {...string} texts
 */
export function computeSourceHash(...texts) {
	const normalized = texts.map((text) => text.replaceAll("\r\n", "\n")).join("\0");
	return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

/** @param {string} projectDir */
export function readSourceHash(projectDir) {
	return computeSourceHash(...HASH_SOURCES.map((rel) => readSource(projectDir, rel)));
}

/**
 * @typedef {object} PublishedState
 * @property {string} url
 * @property {string} sourceHash
 */

/**
 * The last publish from this machine, or `null` if it was never published.
 * @param {string} projectDir
 * @returns {PublishedState | null}
 */
export function findPublishedState(projectDir) {
	try {
		const parsed = JSON.parse(readFileSync(path.join(projectDir, PUBLISHED_STATE), "utf8"));
		if (typeof parsed?.url === "string" && typeof parsed?.sourceHash === "string") return parsed;
	} catch {
		// Missing or unreadable: the same as never published.
	}
	return null;
}

/**
 * @param {string} projectDir
 * @param {PublishedState} state
 */
export function writePublishedState(projectDir, state) {
	writeFileSync(path.join(projectDir, PUBLISHED_STATE), `${JSON.stringify(state, null, "\t")}\n`);
}

/**
 * The fingerprint the data was generated with, or `null` if there is no data yet.
 * @param {string} projectDir
 */
export function findBoardDataHash(projectDir) {
	try {
		const parsed = JSON.parse(readFileSync(path.join(projectDir, BOARD_DATA), "utf8"));
		return typeof parsed?.sourceHash === "string" ? parsed.sourceHash : null;
	} catch {
		return null;
	}
}

/** The command that regenerates the data, written the same way in every message. */
export const GENERATE_COMMAND = "node ~/.claude/panel/generate.mjs";
