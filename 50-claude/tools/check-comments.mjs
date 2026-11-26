#!/usr/bin/env node
// @ts-check
// Fails when a tracked file has a code comment written in Spanish. Code comments are English
// (the global CLAUDE.md and docs/contributing/comments.md in dotfiles-windows), and a session that
// loads an older Spanish-only rule would write them in Spanish again without anything noticing.
//
// Shared by every repo through ~/.claude/tools. It reads comments and test names (the global rule
// wants both in English, and CI prints the names), never other string literals, so Spanish text
// kept on purpose in strings is out of reach by design. What it skips is printed with every run,
// passing or failing, so the exemptions are visible, not buried here. A repo adds file types, skipped paths
// and its own exemptions in .claude/comments.json (or --config), with this shape:
//   { "styles": { "hash": ["regex"], "slash": [], "dash": [], "ini": [] },
//     "skip": ["regex"], "exemptions": ["text printed with every run"] }
//
// The test is a heuristic, not a language detector: a comment is Spanish if it has an accented
// letter or more Spanish function words than English ones, so even a short label such as
// "Bloques de tareas" fails. Text between «» or backticks does not count: those are quoted terms.
//
// Usage: node check-comments.mjs [repo folder] [--config file]

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

/** Printed with every run, before the repo's own exemptions. */
export const EXEMPTIONS = [
	"Markdown files: docs are bilingual pairs, and CLAUDE.md, .claude/rules/, docs/tasks.md and docs/backlog.md are Spanish by rule.",
	"String literals other than test names: text a program shows or writes is not a comment.",
	"Text between «» or backticks inside a comment: quoted terms and identifiers.",
];

/**
 * @typedef {object} CommentStyle
 * @property {string[]} line Prefixes of a full-line comment.
 * @property {[string, string][]} blocks Openers and closers of a block comment.
 * @property {RegExp | null} trailing A comment after code, found on the line with strings masked.
 */

/** @type {Record<string, CommentStyle>} */
export const STYLES = {
	hash: { line: ["#"], blocks: [["<#", "#>"]], trailing: /\s#(\s|$)/ },
	slash: {
		line: ["//"],
		blocks: [
			["/*", "*/"],
			// JSX: a comment inside markup is wrapped in braces.
			["{/*", "*/}"],
			["<!--", "-->"],
		],
		trailing: /(^|\s)\/\/(\s|$)/,
	},
	dash: { line: ["--"], blocks: [["--[[", "]]"]], trailing: /\s--(\s|$)/ },
	ini: { line: [";", "#"], blocks: [], trailing: null },
};

// Which style each file uses. `trailing` says whether a comment can follow code on the same line:
// in .gitignore, .gitattributes, gitconfig or a .conf, a `#` after text can be part of the value.
const FILE_STYLES = [
	{
		style: "hash",
		trailing: true,
		pattern:
			/\.(ps1|psm1|psd1|sh|bash|zsh|ya?ml)$|(^|\/)(\.bashrc|\.bash_profile|\.zshrc|\.zprofile|\.profile|post-merge|bspwmrc)$/,
	},
	{
		style: "hash",
		trailing: false,
		pattern:
			/\.(toml|conf)$|(^|\/)(\.gitignore|\.gitattributes|\.prettierignore|\.editorconfig|editorconfig|gitconfig[\w-]*|sxhkdrc)$/,
	},
	{ style: "slash", trailing: true, pattern: /\.(m?js|cjs|ts|css|jsonc?|html|rasi|xkb)$/ },
	{ style: "dash", trailing: true, pattern: /\.lua$/ },
	{ style: "ini", trailing: false, pattern: /\.ini$/ },
];

// Directives, not prose.
const DIRECTIVE = /^(#!|#Requires\b|#region\b|#endregion\b|\/\/ @ts-)/;

const ACCENT = /[áéíóúñü¿¡]/i;
const SPANISH = new Set(
	("que los las del para con una unos unas por sin cuando esta este estos estas pero como porque " +
		"hay son lo al se el la de y en es un ya su sus muy nada todo todos todas cada desde hasta " +
		"solo ni nunca siempre puede pueden sobre entre otro otra tiene tienen").split(" "),
);
const ENGLISH = new Set(
	("the and of to is are was be this that these with for from into on in it its you we they " +
		"there what which when where how not but or if then so can will would should have has do " +
		"does just also all any each only after before about because while still a an by as at").split(" "),
);

/**
 * @typedef {object} CommentConfig
 * @property {Record<string, string[]>} [styles] Extra path regexes per style name.
 * @property {string[]} [skip] Path regexes that are not checked.
 * @property {string[]} [exemptions] The repo's own exemptions, printed with every run.
 * @property {string[]} [directives] Regexes for comments that are markers a tool reads, not
 *   prose, such as `kind: todos:start`; matched against the comment text.
 */

/**
 * The comment style of a file and whether it allows trailing comments, or null when the file has
 * no comments this check knows. A script with no extension is told by its shebang.
 *
 * @param {string} file Repo-relative path, with `/`.
 * @param {string} text
 * @param {CommentConfig} [config]
 * @returns {{ style: CommentStyle, trailing: boolean } | null}
 */
export function styleOf(file, text, config = {}) {
	for (const [name, patterns] of Object.entries(config.styles ?? {})) {
		if (STYLES[name] && patterns.some((p) => new RegExp(p).test(file))) {
			return { style: STYLES[name], trailing: name === "slash" || name === "dash" };
		}
	}
	const known = FILE_STYLES.find((entry) => entry.pattern.test(file));
	if (known) return { style: STYLES[known.style], trailing: known.trailing };
	if (!path.posix.basename(file).includes(".") && text.startsWith("#!")) {
		const firstLine = text.slice(0, text.indexOf("\n") >>> 0);
		return { style: /\bnode\b/.test(firstLine) ? STYLES.slash : STYLES.hash, trailing: true };
	}
	return null;
}

/**
 * Masks quoted text with `_`, keeping the length, so a `#` or `//` inside a string is not taken
 * for a comment.
 * @param {string} line
 */
function maskStrings(line) {
	return line.replaceAll(/"(?:[^"\\]|\\.)*"|'[^'\n]*'/g, (m) => `${m[0]}${"_".repeat(m.length - 2)}${m.at(-1)}`);
}

/**
 * The comments of a file, one entry per run of consecutive comment lines.
 * @param {string} file Repo-relative path, with `/`.
 * @param {string} text
 * @param {CommentConfig} [config]
 * @returns {{ line: number, text: string }[]}
 */
export function extractComments(file, text, config = {}) {
	const found = styleOf(file, text, config);
	if (!found) return [];
	const { style, trailing } = found;
	// `group` decides what is joined: the lines of one block comment, or full-line comments in a
	// row. A comment after code stands alone.
	/** @type {{ line: number, text: string, group: string }[]} */
	const lines = [];
	/** @type {string | null} */
	let blockEnd = null;
	text.split(/\r?\n/).forEach((raw, index) => {
		const line = index + 1;
		const trimmed = raw.trim();
		if (blockEnd) {
			const end = trimmed.indexOf(blockEnd);
			const group = lines.at(-1)?.group ?? `block-${line}`;
			lines.push({ line, text: (end >= 0 ? trimmed.slice(0, end) : trimmed).replace(/^\*\s?/, ""), group });
			if (end >= 0) blockEnd = null;
			return;
		}
		if (DIRECTIVE.test(trimmed)) return;
		const opener = style.blocks.find(([start]) => trimmed.startsWith(start));
		if (opener) {
			const [start, end] = opener;
			const rest = trimmed.slice(start.length);
			const close = rest.indexOf(end);
			lines.push({ line, text: close >= 0 ? rest.slice(0, close) : rest, group: `block-${line}` });
			if (close < 0) blockEnd = end;
			return;
		}
		const prefix = style.line.find((p) => trimmed.startsWith(p));
		if (prefix) {
			lines.push({ line, text: trimmed.slice(prefix.length), group: "line" });
			return;
		}
		const after = trailing && style.trailing ? style.trailing.exec(maskStrings(raw)) : null;
		if (after) lines.push({ line, text: raw.slice(after.index + after[0].length), group: `trailing-${line}` });
	});

	/** @type {{ line: number, text: string }[]} */
	const comments = [];
	/** @type {{ line: number, group: string } | null} */
	let previous = null;
	for (const entry of lines) {
		const last = comments.at(-1);
		if (last && previous && entry.group === previous.group && entry.line === previous.line + 1) last.text += ` ${entry.text}`;
		else comments.push({ line: entry.line, text: entry.text });
		previous = entry;
	}
	return comments;
}

// Test names, by framework: node:test, Jest and Vitest in JS/TS test files, Pester in .Tests.ps1
// and bats. The name is the first string argument, in any quote style. The call starts its line,
// so a fixture string that contains `test("...")` is not taken for a test.
const TEST_NAMES = [
	{
		file: /\.(test|spec)\.[cm]?[jt]sx?$/,
		name: /^\s*(?:test|it|describe|suite)(?:\.\w+)?\(\s*(["'`])((?:\\.|(?!\1).)*)\1/gm,
	},
	{ file: /\.Tests\.ps1$/i, name: /^\s*(?:Describe|Context|It)\s+(["'])((?:(?!\1).)*)\1/gm },
	{ file: /\.bats$/, name: /^\s*@test\s+(["'])((?:(?!\1).)*)\1/gm },
];

/**
 * The test names of a test file, with their line.
 * @param {string} file Repo-relative path, with `/`.
 * @param {string} text
 * @returns {{ line: number, text: string }[]}
 */
export function extractTestNames(file, text) {
	const framework = TEST_NAMES.find((entry) => entry.file.test(file));
	if (!framework) return [];
	return [...text.matchAll(framework.name)].map((m) => ({
		line: text.slice(0, m.index).split("\n").length,
		text: m[2],
	}));
}

/**
 * Whether a comment reads as Spanish, once its quoted terms are removed.
 * @param {string} text
 */
export function isSpanish(text) {
	const prose = text
		.replaceAll(/«[^»]*»/g, " ")
		.replaceAll(/`[^`]*`/g, " ")
		.replaceAll(/"[^"]*"/g, " ")
		.replaceAll(/(^|[^\p{L}])'[^']*'(?![\p{L}])/gu, " ");
	// A capitalized word in the middle of a sentence is a proper noun ("Pago Móvil") or a code
	// ("ES", "MX") and says nothing about the language around it. Function words count only in
	// lowercase, so "El Salvador" in an English comment is not Spanish either.
	const words = [...prose.matchAll(/[\p{L}]+/gu)].filter(
		(m) => m[0] === m[0].toLowerCase() || /(^|[.!?:;]\s*)$/.test(prose.slice(0, m.index).trimEnd()),
	);
	if (words.some((m) => ACCENT.test(m[0]))) return true;
	let es = 0;
	let en = 0;
	for (const word of words.map((m) => m[0]).filter((w) => w === w.toLowerCase())) {
		if (SPANISH.has(word)) es++;
		if (ENGLISH.has(word)) en++;
	}
	return es > en;
}

/**
 * Spanish comments and test names in the given files.
 * @param {string} root
 * @param {readonly string[]} files Repo-relative paths.
 * @param {CommentConfig} [config]
 */
export function findSpanishComments(root, files, config = {}) {
	const found = [];
	const directives = (config.directives ?? []).map((p) => new RegExp(p));
	for (const file of files) {
		const text = readFileSync(path.join(root, file), "utf8");
		const texts = [
			// A run of markers is joined into one entry, so each line of it must be a marker.
			...extractComments(file, text, config).filter(
				(c) => !c.text.split(/\s{2,}/).every((part) => directives.some((re) => re.test(part.trim()))),
			),
			...extractTestNames(file, text).map((t) => ({ ...t, text: `test name: ${t.text}` })),
		];
		for (const entry of texts) {
			if (isSpanish(entry.text)) found.push({ file, line: entry.line, text: entry.text.trim().slice(0, 80) });
		}
	}
	return found;
}

/**
 * The repo's config: the given file, or .claude/comments.json if the repo has one, or none.
 * @param {string} root
 * @param {string} [file]
 * @returns {CommentConfig}
 */
export function loadConfig(root, file) {
	const configPath = file ? path.resolve(file) : path.join(root, ".claude", "comments.json");
	if (!existsSync(configPath)) {
		if (file) throw new Error(`config not found: ${configPath}`);
		return {};
	}
	return JSON.parse(readFileSync(configPath, "utf8"));
}

// Runs only from the command line, not when the test imports it.
const invoked = process.argv[1] ? realpathSync(process.argv[1]) : "";
if (invoked === realpathSync(fileURLToPath(import.meta.url))) {
	const { values, positionals } = parseArgs({ options: { config: { type: "string" } }, allowPositionals: true });
	const root = path.resolve(positionals[0] ?? process.cwd());
	const config = loadConfig(root, values.config);
	const skip = (config.skip ?? []).map((p) => new RegExp(p));
	const files = execFileSync("git", ["-C", root, "ls-files"], { encoding: "utf8" })
		.split("\n")
		.filter((file) => file && !file.endsWith(".md") && !skip.some((re) => re.test(file)));
	const found = findSpanishComments(root, files, config);
	if (found.length > 0) {
		for (const hit of found) console.log(`${hit.file}:${hit.line} ${hit.text}`);
		console.log(
			`${found.length} Spanish comment(s) or test name(s): write them in English (docs/contributing/comments.md in dotfiles-windows).`,
		);
	} else console.log(`Comment language: no Spanish comments or test names in ${files.length} files`);
	// Printed on both outcomes: a failure is when the reader most needs to know what is left out.
	for (const exemption of [...EXEMPTIONS, ...(config.exemptions ?? [])]) console.log(`exempt: ${exemption}`);
	for (const pattern of config.skip ?? []) console.log(`exempt: paths matching ${pattern}`);
	for (const pattern of config.directives ?? []) console.log(`exempt: marker comments matching ${pattern}`);
	process.exitCode = found.length > 0 ? 1 : 0;
}
