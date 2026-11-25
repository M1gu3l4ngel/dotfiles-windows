#!/usr/bin/env node
// @ts-check
// Fails when a tracked file has a code comment written in Spanish: in this repo comments are
// English (docs/contributing/comments.md), and a session that loads a Spanish-only rule would
// otherwise write them in Spanish again without anything noticing.
//
// It reads only comments, never string literals, so the Spanish text that stays on purpose (the
// panel's visible text, the tasks.md templates, the test fixtures) is out of reach by design.
// What it skips is printed with every run, so the exemptions are visible, not buried here.
//
// The test is a heuristic, not a language detector: a comment is Spanish if it has an accented
// letter or more Spanish function words than English ones, so even a short label such as
// "Bloques de tareas" fails. Text between «» or backticks does not count: those are quoted terms
// (`Por probar`, «en curso»).
//
// Usage: node tools/check-comments.mjs [repo folder]

import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const EXEMPTIONS = [
	"Markdown files: docs are bilingual pairs, and CLAUDE.md, .claude/rules/, docs/tasks.md and docs/backlog.md are Spanish by rule.",
	"String literals: the panel's visible text, the docs/tasks.md templates init.mjs writes and the test fixtures that mimic docs/tasks.md stay Spanish.",
	"Text between «» or backticks inside a comment: panel terms read from docs/tasks.md (Por probar, en curso...) and quoted identifiers.",
];

const HASH_FILE =
	/\.(ps1|psm1|psd1|sh|ya?ml|toml)$|(^|\/)(\.bashrc|\.bash_profile|\.gitignore|\.gitattributes|\.prettierignore|\.editorconfig|editorconfig|gitconfig[\w-]*|post-merge)$/;
const SLASH_FILE = /\.(m?js|cjs|ts|css|jsonc?|html)$/;
// Where a comment can also follow code on the same line. In the other hash files (.gitignore,
// .gitattributes, gitconfig) a `#` after text is part of the value.
const HASH_TRAILING = /\.(ps1|psm1|psd1|sh|ya?ml)$|(^|\/)(\.bashrc|\.bash_profile|post-merge)$/;

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
 * @returns {{ line: number, text: string }[]}
 */
export function extractComments(file, text) {
	const isHash = HASH_FILE.test(file);
	const isSlash = SLASH_FILE.test(file);
	if (!isHash && !isSlash) return [];
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
		const opener = [
			["<#", "#>", isHash],
			["/*", "*/", isSlash],
			["<!--", "-->", isSlash],
		].find(([start, , applies]) => applies && trimmed.startsWith(/** @type {string} */ (start)));
		if (opener) {
			const [start, end] = /** @type {[string, string]} */ (opener);
			const rest = trimmed.slice(start.length);
			const close = rest.indexOf(end);
			lines.push({ line, text: close >= 0 ? rest.slice(0, close) : rest, group: `block-${line}` });
			if (close < 0) blockEnd = end;
			return;
		}
		if (isHash && trimmed.startsWith("#")) {
			// Directives, not prose.
			if (/^#(!|Requires\b|region\b|endregion\b)/.test(trimmed)) return;
			lines.push({ line, text: trimmed.slice(1), group: "line" });
			return;
		}
		if (isSlash && trimmed.startsWith("//")) {
			if (trimmed.startsWith("// @ts-")) return;
			lines.push({ line, text: trimmed.slice(2), group: "line" });
			return;
		}
		const masked = maskStrings(raw);
		const trailing = isSlash ? /(^|\s)\/\/(\s|$)/.exec(masked) : HASH_TRAILING.test(file) ? /\s#(\s|$)/.exec(masked) : null;
		if (trailing) lines.push({ line, text: raw.slice(trailing.index + trailing[0].length), group: `trailing-${line}` });
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
	if (ACCENT.test(prose)) return true;
	let es = 0;
	let en = 0;
	for (const word of prose.toLowerCase().match(/[\p{L}]+/gu) ?? []) {
		if (SPANISH.has(word)) es++;
		if (ENGLISH.has(word)) en++;
	}
	return es > en;
}

/**
 * Spanish comments in the given files.
 * @param {string} root
 * @param {readonly string[]} files Repo-relative paths.
 */
export function findSpanishComments(root, files) {
	const found = [];
	for (const file of files) {
		const text = readFileSync(path.join(root, file), "utf8");
		for (const comment of extractComments(file, text)) {
			if (isSpanish(comment.text)) found.push({ file, line: comment.line, text: comment.text.trim().slice(0, 80) });
		}
	}
	return found;
}

// Runs only from the command line, not when the test imports it.
const invoked = process.argv[1] ? realpathSync(process.argv[1]) : "";
if (invoked === realpathSync(fileURLToPath(import.meta.url))) {
	const root = path.resolve(process.argv[2] ?? process.cwd());
	const files = execFileSync("git", ["-C", root, "ls-files"], { encoding: "utf8" })
		.split("\n")
		.filter((file) => file && !file.endsWith(".md"));
	const found = findSpanishComments(root, files);
	if (found.length > 0) {
		for (const hit of found) console.log(`${hit.file}:${hit.line} ${hit.text}`);
		console.log(`${found.length} Spanish comment(s): write them in English (docs/contributing/comments.md).`);
		process.exit(1);
	}
	console.log(`Comment language: no Spanish comments in ${files.length} files`);
	for (const exemption of EXEMPTIONS) console.log(`exempt: ${exemption}`);
}
