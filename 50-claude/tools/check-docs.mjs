#!/usr/bin/env node
// @ts-check
// Checks a repo's documentation, which is written in English only, as the global CLAUDE.md asks of
// every repo:
//   1. no document has a translated copy (X.es.md) or a language selector on line 1;
//   2. relative links point to files that exist, and anchors (#section) to headings that exist;
//   3. no table row passes MAX_TABLE_ROW_CHARS;
//   4. the repo carries every community file (skills/new-repo/docs-standard.md in the Claude Code
//      layer), private or public: GitHub shows README, Code of conduct, Contributing, License and
//      Security as tabs of the repository page, and the issue and pull request templates shape
//      every contribution. NOTICE too under Apache-2.0.
//
// Shared by every repo through ~/.claude/tools, so dotfiles-windows and dotfiles-parrot run one
// implementation. Agent instructions and the task lists are Spanish by design, so they are left
// out; a repo leaves out more with --exclude (a path, or a folder ending in /).
//
// Usage: node check-docs.mjs [repo folder] [--exclude path]...

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

/** Left out in every repo: instructions for Claude Code and the task panel lists (Spanish only). */
export const DEFAULT_EXCLUDES = [".claude/", "docs/tasks.md", "docs/backlog.md"];

/** The sections every README closes with, in this order, each linking to its file. */
export const README_CLOSING_SECTIONS = ["Contributing", "Security", "License"];

/** The file each closing section links to: the README points, the file explains. */
const README_CLOSING_LINKS = { Contributing: "CONTRIBUTING.md", Security: "SECURITY.md", License: "LICENSE" };

/**
 * The problems of a README's header and closing (skills/new-repo/docs-standard.md, section 3):
 * it opens centered with the logo in a `<picture>` that has a dark version, has no `#` title, a
 * `---` rule ends the header before the first section, the header's link row follows the
 * sections' order, and the closing sections are the last ones, in their order.
 *
 * @param {string} text
 */
export function checkReadme(text) {
	const lines = text.split(/\r?\n/);
	const problems = [];
	const firstSection = lines.findIndex((line) => line.startsWith("## "));
	const rule = lines.findIndex((line) => line.trim() === "---");
	const header = lines.slice(0, rule < 0 ? firstSection : rule).join("\n");
	// A leading HTML comment (a marker a tool reads) is not part of what the reader sees.
	if (!/^(\s*<!--[\s\S]*?-->)*\s*<p align="center">/.test(text)) problems.push('opens with <p align="center"> and the logo');
	if (!/<picture>[\s\S]*prefers-color-scheme: dark[\s\S]*<\/picture>/.test(header)) {
		problems.push("the header logo is a <picture> with a prefers-color-scheme: dark source");
	}
	if (/^# /m.test(header)) problems.push("no # title: the logo already says the name");
	if (rule < 0 || (firstSection >= 0 && rule > firstSection)) problems.push("a --- rule ends the header, before the first section");
	const sections = lines.filter((line) => line.startsWith("## ")).map((line) => line.slice(3).trim());
	const anchors = sections.map((section) => slug(section, new Map()));
	const linked = [...header.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
	const order = linked.map((anchor) => anchors.indexOf(anchor));
	if (order.some((index, i) => i > 0 && index < order[i - 1])) problems.push("the header's links follow the order of the sections");
	const closing = sections.slice(-README_CLOSING_SECTIONS.length);
	if (closing.join() !== README_CLOSING_SECTIONS.join()) {
		problems.push(`the last sections are ${README_CLOSING_SECTIONS.join(", ")}, in that order (now: ${closing.join(", ")})`);
	}
	for (const [section, file] of Object.entries(README_CLOSING_LINKS)) {
		const body = text.split(new RegExp(`^## ${section}\\s*$`, "m"))[1]?.split(/^## /m)[0] ?? "";
		if (body && !body.includes(`](${file})`)) problems.push(`the ${section} section links to ${file}`);
	}
	return problems.map((problem) => `README.md: ${problem}`);
}

/** The files every repo carries, private or public. */
export const COMMUNITY_FILES = [
	"README.md",
	"CHANGELOG.md",
	"CONTRIBUTING.md",
	"CODE_OF_CONDUCT.md",
	"SECURITY.md",
	"LICENSE",
	".github/pull_request_template.md",
	".github/ISSUE_TEMPLATE/config.yml",
	".github/ISSUE_TEMPLATE/bug_report.yml",
	".github/ISSUE_TEMPLATE/feature_request.yml",
];

/**
 * The community files missing from a repo; Apache-2.0 also needs its NOTICE.
 *
 * @param {string} root
 */
export function checkCommunity(root) {
	const required = [...COMMUNITY_FILES];
	const license = path.join(root, "LICENSE");
	if (existsSync(license) && readFileSync(license, "utf8").includes("Apache License")) required.push("NOTICE");
	return required.filter((f) => !existsSync(path.join(root, f))).map((f) => `${f}: missing (every repo carries it)`);
}

/**
 * Whether a repo-relative path is left out: any CLAUDE.md, or a match of an exclude (a folder
 * when it ends in `/`).
 *
 * @param {string} file
 * @param {readonly string[]} excludes
 */
export function isExcluded(file, excludes) {
	if (path.posix.basename(file) === "CLAUDE.md") return true;
	return excludes.some((x) => (x.endsWith("/") ? file.startsWith(x) : file === x));
}

/**
 * GitHub's anchor for a heading: lowercase, no punctuation (accented letters stay), spaces to
 * hyphens, and -1, -2... when it repeats.
 *
 * @param {string} heading
 * @param {Map<string, number>} seen
 */
export function slug(heading, seen) {
	const base = heading.trim().toLowerCase().replaceAll(/[^\p{L}\p{N}_\- ]/gu, "").replaceAll(" ", "-");
	const n = seen.get(base) ?? 0;
	seen.set(base, n + 1);
	return n === 0 ? base : `${base}-${n}`;
}

/**
 * The first line, the relative links and the anchors of a document.
 * @param {string} text
 */
export function readDoc(text) {
	const lines = text.split(/\r?\n/);
	const doc = {
		first: lines[0] ?? "",
		/** @type {string[]} */ links: [],
		/** @type {Set<string>} */ anchors: new Set(),
		/** @type {number[]} */ wideTables: [],
	};
	const seen = new Map();
	let inside = false;
	let tableStart = 0;
	for (const [index, line] of lines.entries()) {
		if (line.trim().startsWith("```")) {
			inside = !inside;
			continue;
		}
		// A link inside a code block is an example, not a link.
		if (inside) continue;
		if (!line.trimStart().startsWith("|")) tableStart = 0;
		else {
			tableStart ||= index + 1;
			// By characters, not bytes: an accent takes one column in the editor.
			const wide = Array.from(line.trimEnd()).length > MAX_TABLE_ROW_CHARS;
			if (wide && doc.wideTables.at(-1) !== tableStart) doc.wideTables.push(tableStart);
		}
		if (/^#{1,6} /.test(line)) doc.anchors.add(slug(line.replace(/^#+/, ""), seen));
		// Markdown links and the HTML ones a README header uses (`<a href>`, `<img src>`, `<source
		// srcset>`), so a logo or a header link that breaks is caught too.
		for (const match of line.matchAll(/\]\(([^)\s]+)\)|\b(?:href|src|srcset)="([^"\s]+)"/g)) {
			const target = match[1] ?? match[2];
			if (!/^[a-z]+:/.test(target)) doc.links.push(target);
		}
	}
	return doc;
}

/**
 * Prettier pads every column of a table to its longest cell, so one sentence in a cell stretches
 * every row until the table cannot be read in an editor. A table holds short data; a sentence
 * goes in a list. Prettier's width (100) plus a margin; the same limit as a brain's `pnpm check`.
 */
export const MAX_TABLE_ROW_CHARS = 120;

/** @param {string} target 'x.md#anchor' → ['x.md', 'anchor'] */
const splitAnchor = (target) => {
	const hash = target.indexOf("#");
	return hash < 0 ? [target, ""] : [target.slice(0, hash), target.slice(hash + 1)];
};

/** A line 1 that offers another language, such as `**English** | [Español](README.es.md)`. */
const SELECTOR = /^\*\*English\*\* \||\| \*\*Español\*\*$|\]\([^)]*\.es\.md\)/;

/**
 * The problems of a set of documents; an empty list means they are fine.
 *
 * @param {string} root
 * @param {readonly string[]} files Repo-relative Markdown paths, with `/`, already filtered.
 */
export function checkDocs(root, files) {
	/** @type {Map<string, ReturnType<typeof readDoc>>} */
	const docs = new Map(files.map((f) => [f, readDoc(readFileSync(path.join(root, f), "utf8"))]));
	const problems = [];

	for (const [file, doc] of docs) {
		if (file.endsWith(".es.md")) {
			problems.push(`${file}: translated copy; documents are English only, delete it`);
			continue;
		}
		if (SELECTOR.test(doc.first)) problems.push(`${file}: line 1 is a language selector; remove it`);
		for (const line of doc.wideTables) {
			problems.push(`${file}:${line}: a table row passes ${MAX_TABLE_ROW_CHARS} characters; shorten it or use a list`);
		}
		for (const target of doc.links) {
			const [filePart, anchor] = splitAnchor(target);
			const dest = filePart ? path.posix.normalize(path.posix.join(path.posix.dirname(file), filePart)) : file;
			if (!existsSync(path.join(root, dest))) {
				problems.push(`${file}: broken link to ${target}`);
				continue;
			}
			const destDoc = docs.get(dest);
			if (anchor && destDoc && !destDoc.anchors.has(anchor)) {
				problems.push(`${file}: anchor #${anchor} does not exist in ${dest}`);
			}
		}
	}
	return { documents: docs.size, problems };
}

// Runs only from the command line, not when the test imports it.
const invoked = process.argv[1] ? realpathSync(process.argv[1]) : "";
if (invoked === realpathSync(fileURLToPath(import.meta.url))) {
	const { values, positionals } = parseArgs({
		options: { exclude: { type: "string", multiple: true, default: [] } },
		allowPositionals: true,
	});
	const root = path.resolve(positionals[0] ?? process.cwd());
	const excludes = [...DEFAULT_EXCLUDES, ...values.exclude];
	// --others includes new documents not yet added: the check must see them before the commit.
	const listed = execFileSync("git", ["-C", root, "ls-files", "--cached", "--others", "--exclude-standard", "--", "*.md"], {
		encoding: "utf8",
	});
	const files = [...new Set(listed.split("\n"))]
		.filter((f) => f && existsSync(path.join(root, f)) && !isExcluded(f, excludes))
		.sort();
	const { documents, problems } = checkDocs(root, files);
	problems.push(...checkCommunity(root));
	const readme = path.join(root, "README.md");
	if (existsSync(readme)) problems.push(...checkReadme(readFileSync(readme, "utf8")));
	if (problems.length > 0) {
		for (const problem of problems) console.log(problem);
		process.exit(1);
	}
	console.log(`Docs: ${documents} documents in English, links, anchors and tables fine, every community file present`);
}
