#!/usr/bin/env node
// @ts-check
// Checks that a repo's bilingual documentation is in sync: each X.md (English) has its X.es.md
// (Spanish), as the global CLAUDE.md asks of every repo. Translated text cannot be compared, so it
// compares everything that does not change between languages:
//   1. the pair exists and each one has the language selector on line 1;
//   2. the same number of headings, table rows and list items;
//   3. identical code blocks (ignoring indentation);
//   4. the same relative links, in the same order, each one to its own language;
//   5. links that exist and anchors (#section) that exist in their target.
//
// Shared by every repo through ~/.claude/tools, so dotfiles-windows and dotfiles-parrot run one
// implementation. Agent instructions and the task lists are Spanish only and the GitHub templates
// in .github/ are English only, so they are never compared; a repo leaves out more with --exclude
// (a path, or a folder ending in /).
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

const ES = ".es.md";

/**
 * Left out in every repo: instructions for Claude Code and the task panel lists (Spanish only), and
 * the GitHub templates (English only: GitHub shows one per repo).
 */
export const DEFAULT_EXCLUDES = [".claude/", ".github/", "docs/tasks.md", "docs/backlog.md"];

const PERSONAL = ["README.md", "CHANGELOG.md"];
const SHARED = [...PERSONAL, "CONTRIBUTING.md", ".github/pull_request_template.md"];

/** The files each kind of repo carries; each Markdown one also needs its pair, which checkDocs sees. */
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
 * What a document has that does not change with the language.
 * @param {string} text
 */
export function readDoc(text) {
	const lines = text.split(/\r?\n/);
	const doc = {
		first: lines[0] ?? "",
		headings: 0,
		rows: 0,
		items: 0,
		/** @type {string[]} */ code: [],
		/** @type {string[]} */ links: [],
		/** @type {Set<string>} */ anchors: new Set(),
	};
	const seen = new Map();
	let inside = false;
	// Line 1 is the language selector: it is validated on its own.
	for (const line of lines.slice(1)) {
		const stripped = line.trim();
		if (stripped.startsWith("```")) {
			inside = !inside;
			doc.code.push("```");
			continue;
		}
		if (inside) {
			// Without indentation: a block inside a list carries it.
			doc.code.push(stripped);
			continue;
		}
		if (/^#{1,6} /.test(line)) {
			doc.headings++;
			doc.anchors.add(slug(line.replace(/^#+/, ""), seen));
		} else if (stripped.startsWith("|")) doc.rows++;
		else if (/^\s*([-*]|\d+\.) /.test(line)) doc.items++;
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

/**
 * The problems of a set of documents; an empty list means they are in sync.
 *
 * @param {string} root
 * @param {readonly string[]} files Repo-relative Markdown paths, with `/`, already filtered.
 */
export function checkDocs(root, files) {
	/** @type {Map<string, ReturnType<typeof readDoc>>} */
	const docs = new Map(files.map((f) => [f, readDoc(readFileSync(path.join(root, f), "utf8"))]));
	const problems = [];
	let pairs = 0;

	for (const en of files) {
		if (en.endsWith(ES)) {
			if (!docs.has(`${en.slice(0, -ES.length)}.md`)) problems.push(`${en}: missing its English version`);
			continue;
		}
		const es = `${en.slice(0, -3)}${ES}`;
		const a = docs.get(en);
		const b = docs.get(es);
		if (!a || !b) {
			problems.push(`${en}: missing its Spanish version (${es})`);
			continue;
		}
		pairs++;
		const name = path.posix.basename(en);
		const base = name.slice(0, -3);
		if (a.first !== `**English** | [Español](${base}${ES})`) problems.push(`${en}: line 1 must be the language selector`);
		if (b.first !== `[English](${name}) | **Español**`) problems.push(`${es}: line 1 must be the language selector`);
		for (const [key, label] of /** @type {const} */ ([
			["headings", "headings"],
			["rows", "table rows"],
			["items", "list items"],
		])) {
			if (a[key] !== b[key]) problems.push(`${en} / ${es}: ${label} ${a[key]} / ${b[key]}`);
		}
		if (a.code.join("\n") !== b.code.join("\n")) problems.push(`${en} / ${es}: code blocks differ`);
		// Same target once the language and the anchor are removed (anchors follow the translated
		// heading).
		const linksEn = a.links.map((l) => splitAnchor(l)[0]);
		const linksEs = b.links.map((l) => splitAnchor(l)[0].replace(/\.es\.md$/, ".md"));
		if (linksEn.join("\n") !== linksEs.join("\n")) problems.push(`${en} / ${es}: links do not match`);
	}

	for (const [file, doc] of docs) {
		const spanish = file.endsWith(ES);
		for (const target of doc.links) {
			const [filePart, anchor] = splitAnchor(target);
			const dest = filePart ? path.posix.normalize(path.posix.join(path.posix.dirname(file), filePart)) : file;
			if (!existsSync(path.join(root, dest))) {
				problems.push(`${file}: broken link to ${target}`);
				continue;
			}
			if (dest.endsWith(".md")) {
				const isEs = dest.endsWith(ES);
				if (spanish && !isEs && docs.has(`${dest.slice(0, -3)}${ES}`)) {
					problems.push(`${file}: ${target} points to the English version`);
				}
				if (!spanish && isEs) problems.push(`${file}: ${target} points to the Spanish version`);
			}
			const destDoc = docs.get(dest);
			if (anchor && destDoc && !destDoc.anchors.has(anchor)) {
				problems.push(`${file}: anchor #${anchor} does not exist in ${dest}`);
			}
		}
	}
	return { pairs, problems };
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
	const { pairs, problems } = checkDocs(root, files);
	if (kind) problems.push(...checkCommunity(root, /** @type {keyof typeof COMMUNITY_FILES} */ (kind)));
	if (problems.length > 0) {
		for (const problem of problems) console.log(problem);
		process.exit(1);
	}
	console.log(`Bilingual docs: ${pairs} pairs in sync${kind ? `, every file of a ${kind} repo present` : ""}`);
}
