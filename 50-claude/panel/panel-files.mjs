// @ts-check
// Lo que comparten los comandos del panel (`generate`, `check`, `init`) y sus hooks: dónde vive
// cada archivo en el repo, su configuración y la huella de sus fuentes.
//
// La huella hace imposible el desfase silencioso: `generate` la escribe en los datos, el hook de
// publicar guarda la de lo publicado y al abrir sesión se compara con la de las fuentes de ahora.
// Vive en un solo módulo para que los comandos y los hooks no puedan calcularla distinto.
//
// Un repo usa el panel si tiene `.claude/panel.json`. Sin ese archivo, los hooks no hacen nada.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CONFIG_FILE = ".claude/panel.json";
export const TASKS_FILE = "docs/tasks.md";
export const BACKLOG_FILE = "docs/backlog.md";
/** Lo generado y lo de esta máquina: la carpeta se ignora a sí misma con su propio `.gitignore`. */
export const OUTPUT_DIR = ".claude/artifacts";
export const BOARD_PAGE = `${OUTPUT_DIR}/project-board.html`;
export const BOARD_DATA = `${OUTPUT_DIR}/tasks.json`;
/** URL y huella de lo último publicado desde esta máquina. */
export const PUBLISHED_STATE = `${OUTPUT_DIR}/published.json`;
export const BOARD_THEME = `${OUTPUT_DIR}/panel-theme.css`;
/** Lo que se publica junto a la página, por su nombre publicado. */
export const BOARD_FILES = { "tasks.json": BOARD_DATA, "panel-theme.css": BOARD_THEME };

const PANEL_DIR = path.dirname(fileURLToPath(import.meta.url));
/** La página fija del panel y su tema, junto a este módulo (en `~/.claude/panel/`, enlazado al repo de dotfiles). */
export const PAGE_TEMPLATE = path.join(PANEL_DIR, "board.html");
export const THEME_TEMPLATE = path.join(PANEL_DIR, "panel-theme.css");

/**
 * @typedef {object} PanelConfig
 * @property {string | null} project Nombre del panel; sin él, el del `package.json` o la carpeta.
 * @property {Record<string, string>} platforms id → nombre visible, el que se escribe tras `**Plataforma:**`.
 * @property {Record<string, string>} devices id → nombre visible, el de las casillas de «Por probar».
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
 * La configuración del panel del repo. Lanza si el archivo no existe o no es JSON: sin ella no se
 * sabe qué plataformas valen, y un panel que las adivinara diría menos que el repo.
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
 * El nombre del panel: el de `panel.json`, el `name` del `package.json` o la carpeta.
 * @param {string} projectDir
 * @param {PanelConfig} config
 */
export function readProjectName(projectDir, config) {
	if (config.project) return config.project;
	try {
		const { name } = JSON.parse(readFileSync(path.join(projectDir, "package.json"), "utf8"));
		if (typeof name === "string" && name) return name;
	} catch {
		// Sin `package.json` legible queda la carpeta.
	}
	return path.basename(projectDir);
}

/**
 * Una fuente tal como está en disco; la que falta cuenta como vacía.
 * @param {string} projectDir
 * @param {string} rel
 */
export function readSource(projectDir, rel) {
	const file = path.isAbsolute(rel) ? rel : path.join(projectDir, rel);
	return existsSync(file) ? readFileSync(file, "utf8") : "";
}

/** Las fuentes de la huella. La página y su tema entran también: si cambian, lo publicado ya no es lo de ahora. */
export const HASH_SOURCES = [TASKS_FILE, BACKLOG_FILE, CONFIG_FILE, PAGE_TEMPLATE, THEME_TEMPLATE];

/** Las fuentes que se editan en el repo: cambiarlas deja el panel desfasado. */
export const EDITED_SOURCES = [TASKS_FILE, BACKLOG_FILE, CONFIG_FILE];

/**
 * Huella de las fuentes, sin distinguir finales de línea (CRLF en Windows, LF en el CI).
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
 * Lo último publicado desde esta máquina, o `null` si nunca se publicó.
 * @param {string} projectDir
 * @returns {PublishedState | null}
 */
export function findPublishedState(projectDir) {
	try {
		const parsed = JSON.parse(readFileSync(path.join(projectDir, PUBLISHED_STATE), "utf8"));
		if (typeof parsed?.url === "string" && typeof parsed?.sourceHash === "string") return parsed;
	} catch {
		// Sin archivo o ilegible: lo mismo que no haber publicado nunca.
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
 * La huella con la que se generaron los datos, o `null` si aún no existen.
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

/** El comando que regenera los datos, escrito igual en todos los avisos. */
export const GENERATE_COMMAND = "node ~/.claude/panel/generate.mjs";
