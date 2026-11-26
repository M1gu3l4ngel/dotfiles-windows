#!/usr/bin/env node
// @ts-check
// Checks a repo's documentation, which is written in English only, as the global CLAUDE.md asks of
// every repo:
//   1. no document has a translated copy (X.es.md) or a language selector on line 1;
//   2. relative links point to files that exist, and anchors (#section) to headings that exist.
//
// Shared by every repo through ~/.claude/tools, so dotfiles-windows and dotfiles-parrot run one
// implementation. Agent instructions and the task lists are Spanish by design, so they are left
// out; a repo leaves out more with --exclude (a path, or a folder ending in /).
//
// --community personal|shared|public also requires the files a repo of that kind carries
// (skills/new-repo/docs-standard.md in the Claude Code layer): README and CHANGELOG always,
// CONTRIBUTING and the pull request template when shared, and the code of conduct, the security
// policy, the license and the issue templates when public, with NOTICE under Apache-2.0.
//
// Usage: node check-docs.mjs [repo folder] [--exclude path]... [--community personal|shared|public]

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

/** Left out in every repo: instructions for Claude Code and the task panel lists (Spanish only). */
export const DEFAULT_EXCLUDES = [".claude/", "docs/tasks.md", "docs/backlog.md"];

const PERSONAL = ["README.md", "CHANGELOG.md"];
const SHARED = [...PERSONAL, "CONTRIBUTING.md", ".github/pull_request_template.md"];

/** The files each kind of repo carries. */
export const COMMUNITY_FILES = {
	personal: PERSONAL,
	shared: SHARED,
	public: [
		...SHARED,
		"CODE_OF_CONDUCT.md",
		"SECURITY.md",
		"LICENSE",
		".github/ISSUE_TEMPLATE/config.yml",
		".github/ISSUE_TEMPLATE/bug_report.yml",
		".github/ISSUE_TEMPLATE/feature_request.yml",
	],
};

/**
 * The community files missing from a repo of the given kind; Apache-2.0 also needs its NOTICE.
 *
 * @param {string} root
 * @param {keyof typeof COMMUNITY_FILES} kind
 */
export function checkCommunity(root, kind) {
	const required = [...COMMUNITY_FILES[kind]];
	const license = path.join(root, "LICENSE");
	if (existsSync(license) && readFileSync(license, "utf8").includes("Apache License")) required.push("NOTICE");
	return required.filter((f) => !existsSync(path.join(root, f))).map((f) => `${f}: missing (required in a ${kind} repo)`);
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
	};
	const seen = new Map();
	let inside = false;
	for (const line of lines) {
		if (line.trim().startsWith("```")) {
			inside = !inside;
			continue;
		}
		// A link inside a code block is an example, not a link.
		if (inside) continue;
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
		options: { exclude: { type: "string", multiple: true, default: [] }, community: { type: "string" } },
		allowPositionals: true,
	});
	const kind = values.community;
	if (kind !== undefined && !(kind in COMMUNITY_FILES)) {
		console.log(`--community must be one of: ${Object.keys(COMMUNITY_FILES).join(", ")}`);
		process.exit(2);
	}
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
	if (kind) problems.push(...checkCommunity(root, /** @type {keyof typeof COMMUNITY_FILES} */ (kind)));
	if (problems.length > 0) {
		for (const problem of problems) console.log(problem);
		process.exit(1);
	}
	console.log(`Docs: ${documents} documents in English, links and anchors resolve${kind ? `, every file of a ${kind} repo present` : ""}`);
}
