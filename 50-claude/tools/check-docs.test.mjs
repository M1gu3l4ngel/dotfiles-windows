// @ts-check
// Tests for the bilingual docs check: one case per comparison it makes, so a regex that stops
// matching shows here and not as two languages quietly drifting apart.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { checkDocs, isExcluded, slug } from "./check-docs.mjs";

const root = mkdtempSync(path.join(tmpdir(), "check-docs-"));
after(() => rmSync(root, { recursive: true, force: true }));

const EN = ["**English** | [Español](README.es.md)", "", "# Setup", "", "- One", "", "| a |", "|---|", "", "```bash", "npm i", "```", "", "See [the guide](docs/guide.md#first-steps)."];
const ES = ["[English](README.md) | **Español**", "", "# Instalación", "", "- Uno", "", "| a |", "|---|", "", "```bash", "npm i", "```", "", "Ver [la guía](docs/guide.es.md#primeros-pasos)."];

/**
 * Writes a set of files in a fresh folder and checks them.
 * @param {Record<string, string[]>} files
 */
function check(files) {
	const dir = mkdtempSync(path.join(root, "case-"));
	mkdirSync(path.join(dir, "docs"));
	const all = {
		"docs/guide.md": ["**English** | [Español](guide.es.md)", "", "## First steps"],
		"docs/guide.es.md": ["[English](guide.md) | **Español**", "", "## Primeros pasos"],
		...files,
	};
	for (const [file, lines] of Object.entries(all)) writeFileSync(path.join(dir, file), lines.join("\n"));
	return checkDocs(dir, Object.keys(all).sort());
}

describe("checkDocs", () => {
	it("passes a pair in sync", () => {
		assert.deepEqual(check({ "README.md": EN, "README.es.md": ES }), { pairs: 2, problems: [] });
	});

	it("reports a missing pair", () => {
		assert.match(check({ "README.md": EN }).problems.join("\n"), /missing its Spanish version/);
	});

	it("reports a wrong language selector", () => {
		const problems = check({ "README.md": ["English | Español", ...EN.slice(1)], "README.es.md": ES }).problems;
		assert.match(problems.join("\n"), /README\.md: line 1 must be the language selector/);
	});

	it("reports a different structure or code block", () => {
		const problems = check({ "README.md": [...EN, "- Two"], "README.es.md": ES.map((l) => l.replace("npm i", "pnpm i")) }).problems;
		assert.match(problems.join("\n"), /list items 2 \/ 1/);
		assert.match(problems.join("\n"), /code blocks differ/);
	});

	it("reports a link to the other language and a missing anchor", () => {
		const es = ES.map((l) => l.replace("docs/guide.es.md#primeros-pasos", "docs/guide.md#no-existe"));
		const problems = check({ "README.md": EN, "README.es.md": es }).problems.join("\n");
		assert.match(problems, /points to the English version/);
		assert.match(problems, /anchor #no-existe does not exist/);
	});

	it("reports a broken link", () => {
		const problems = check({ "README.md": [...EN, "[x](missing.md)"], "README.es.md": [...ES, "[x](missing.md)"] }).problems;
		assert.match(problems.join("\n"), /broken link to missing\.md/);
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
