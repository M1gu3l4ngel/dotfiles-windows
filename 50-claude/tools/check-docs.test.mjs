// @ts-check
// Tests for the docs check: one case per problem it reports, so a regex that stops matching shows
// here and not as a broken link or a stray translation nobody sees.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { checkCommunity, checkDocs, COMMUNITY_FILES, isExcluded, MAX_TABLE_ROW_CHARS, slug } from "./check-docs.mjs";

const root = mkdtempSync(path.join(tmpdir(), "check-docs-"));
after(() => rmSync(root, { recursive: true, force: true }));

const README = ["# Setup", "", "- One", "", "```bash", "see [x](missing.md)", "```", "", "See [the guide](docs/guide.md#first-steps)."];

/**
 * Writes a set of files in a fresh folder and checks them.
 * @param {Record<string, string[]>} files
 */
function check(files) {
	const dir = mkdtempSync(path.join(root, "case-"));
	mkdirSync(path.join(dir, "docs"));
	const all = { "docs/guide.md": ["## First steps"], ...files };
	for (const [file, lines] of Object.entries(all)) writeFileSync(path.join(dir, file), lines.join("\n"));
	return checkDocs(dir, Object.keys(all).sort());
}

describe("checkDocs", () => {
	it("passes documents whose links and anchors resolve, ignoring links inside code blocks", () => {
		assert.deepEqual(check({ "README.md": README }), { documents: 2, problems: [] });
	});

	it("reports a translated copy", () => {
		const problems = check({ "README.md": README, "README.es.md": ["# Instalación"] }).problems.join("\n");
		assert.match(problems, /README\.es\.md: translated copy/);
	});

	it("reports a language selector on line 1", () => {
		const problems = check({ "README.md": ["**English** | [Español](README.es.md)", ...README] }).problems.join("\n");
		assert.match(problems, /README\.md: line 1 is a language selector/);
	});

	it("reports a missing anchor", () => {
		const problems = check({ "README.md": [...README, "[x](docs/guide.md#nope)"] }).problems.join("\n");
		assert.match(problems, /anchor #nope does not exist in docs\/guide\.md/);
	});

	it("checks the HTML links and images of a README header", () => {
		const problems = check({ "README.md": [...README, `<img src="logo.svg" alt="x">`, `<a href="#nope">x</a>`] }).problems.join("\n");
		assert.match(problems, /broken link to logo\.svg/);
		assert.match(problems, /anchor #nope does not exist in README\.md/);
	});

	it("reports a broken link", () => {
		const problems = check({ "README.md": [...README, "[x](missing.md)"] }).problems;
		assert.match(problems.join("\n"), /broken link to missing\.md/);
	});

	it("reports a wide table once, on its first line, and ignores one inside a code block", () => {
		const row = (/** @type {number} */ width) => `| ${"x".repeat(width - 4)} |`;
		const table = ["", row(40), row(MAX_TABLE_ROW_CHARS), row(200), row(300)];
		const fenced = ["", "```markdown", row(300), "```"];
		const { problems } = check({ "README.md": [...README, ...table, ...fenced] });
		assert.deepEqual(problems, [`README.md:11: a table row passes ${MAX_TABLE_ROW_CHARS} characters; shorten it or use a list`]);
	});
});

describe("checkCommunity", () => {
	/** @param {string[]} files */
	function repo(files, license = "MIT License") {
		const dir = mkdtempSync(path.join(root, "community-"));
		for (const file of files) {
			mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
			writeFileSync(path.join(dir, file), file === "LICENSE" ? license : "");
		}
		return dir;
	}

	it("passes a repo with every community file", () => {
		assert.deepEqual(checkCommunity(repo(COMMUNITY_FILES)), []);
	});

	it("asks every repo, private too, for the files GitHub shows as tabs", () => {
		const problems = checkCommunity(repo(["README.md", "CHANGELOG.md"])).join("\n");
		for (const file of ["CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "SECURITY.md", "LICENSE"]) {
			assert.match(problems, new RegExp(`${file.replace(".", "\\.")}: missing \\(every repo carries it\\)`));
		}
	});

	it("asks for NOTICE under Apache-2.0", () => {
		const problems = checkCommunity(repo(COMMUNITY_FILES, "Apache License\nVersion 2.0")).join("\n");
		assert.match(problems, /NOTICE: missing/);
	});
});

describe("helpers", () => {
	it("builds GitHub anchors, keeping accents and numbering repeats", () => {
		const seen = new Map();
		assert.equal(slug(" Instalación rápida (Windows)", seen), "instalación-rápida-windows");
		assert.equal(slug("Instalación rápida (Windows)", seen), "instalación-rápida-windows-1");
	});

	it("leaves out every CLAUDE.md, folders ending in / and exact paths", () => {
		assert.equal(isExcluded("50-claude/CLAUDE.md", []), true);
		assert.equal(isExcluded(".claude/rules/git.md", [".claude/"]), true);
		assert.equal(isExcluded("docs/tasks.md", ["docs/tasks.md"]), true);
		assert.equal(isExcluded("docs/tasks-old.md", ["docs/tasks.md"]), false);
	});
});
