// @ts-check
// Tests for the comment language check: it flags Spanish comments in each comment syntax and
// leaves alone what stays Spanish on purpose (string literals, quoted terms). A check that stops
// matching gives no warning: Spanish comments would simply come back.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractComments, extractTestNames, isSpanish } from "./check-comments.mjs";

/**
 * @param {string} file
 * @param {string} text
 * @param {import("./check-comments.mjs").CommentConfig} [config]
 */
const flagged = (file, text, config) =>
	extractComments(file, text, config)
		.filter((c) => isSpanish(c.text))
		.map((c) => c.line);

describe("isSpanish", () => {
	it("flags a sentence with accents or Spanish function words", () => {
		assert.equal(isSpanish("Configuración del perfil"), true);
		assert.equal(isSpanish("Se ejecuta al iniciar cada sesion de PowerShell"), true);
		assert.equal(isSpanish("Binarios: git nunca debe tocar sus bytes ni normalizarlos."), true);
	});

	it("flags a short label with a single Spanish function word", () => {
		assert.equal(isSpanish("Bloques de tareas."), true);
		assert.equal(isSpanish("Barra superior y contenido."), true);
	});

	it("does not flag an English comment that shares a word with Spanish", () => {
		assert.equal(isSpanish("Swaps the x and y coordinates."), false);
	});

	it("passes English, also with a few Spanish words", () => {
		assert.equal(isSpanish("Runs at the start of every session; reload it with . $PROFILE"), false);
		assert.equal(isSpanish("Within a phase, blocks go from P0 to Mejora."), false);
	});

	it("ignores terms quoted between «» or backticks", () => {
		assert.equal(isSpanish("In «Por probar», one card per platform."), false);
		assert.equal(isSpanish("`[Esta PC] El prompt…` → its devices and the text."), false);
		assert.equal(isSpanish("«Pendientes» leaves out «Por probar»: that work is done."), false);
	});
});

describe("extractComments", () => {
	it("reads # comments in PowerShell, including comment-based help, and skips directives", () => {
		const ps = [
			"#Requires -Version 5.1",
			"<#",
			".SYNOPSIS",
			"  Instala los enlaces de la configuracion del repo.",
			"#>",
			"$x = 1 # valor por defecto para la prueba de la carpeta",
			"# Runs before the links, so nothing is moved aside.",
		].join("\n");
		assert.deepEqual(flagged("install.ps1", ps), [2, 6]);
	});

	it("reads // and /* */ comments in JavaScript and leaves string literals alone", () => {
		const js = [
			"// Lee las tareas de los .md y las convierte en datos",
			'const label = "lo que se hace ahora, con su porqué";',
			"/**",
			" * Une las líneas de un bloque en párrafos.",
			" */",
			"const url = 'https://example.com'; // the public page",
		].join("\n");
		assert.deepEqual(flagged("board.mjs", js), [1, 3]);
	});

	it("reads HTML and CSS comments inside a page", () => {
		const html = [
			"<!--",
			"  Página del panel: las tareas del repo.",
			"-->",
			"<style>",
			"/* Barra superior y el contenido de la página. */",
			"</style>",
		].join("\n");
		assert.deepEqual(flagged("board.html", html), [1, 5]);
	});

	it("reads trailing comments in YAML but not a # inside a value of .gitignore", () => {
		assert.deepEqual(flagged("ci.yml", "fetch-depth: 0 # historial completo: revisa todos los commits"), [1]);
		assert.deepEqual(flagged(".gitignore", "*.log"), []);
	});

	it("joins consecutive comment lines, so a sentence split over lines is judged whole", () => {
		const sh = ["# Prefiere pwsh porque PowerShell 5.1", "# pide admin para los enlaces.", "exec pwsh"].join("\n");
		assert.deepEqual(flagged("post-merge", sh), [1]);
	});

	it("skips files it does not know, such as Markdown", () => {
		assert.deepEqual(extractComments("README.md", "# Configuración del repo"), []);
	});
});

describe("extractTestNames", () => {
	it("reads node:test, Jest and Vitest names in any quote style, with their line", () => {
		const js = [
			'import { test } from "node:test";',
			'test("crea el archivo", () => {});',
			"  it.skip('reads x', () => {});",
			"describe(`agrupa`, () => {});",
			"const fixture = 'test(\"no es un test\")';",
		].join("\n");
		assert.deepEqual(extractTestNames("a.test.mjs", js), [
			{ line: 2, text: "crea el archivo" },
			{ line: 3, text: "reads x" },
			{ line: 4, text: "agrupa" },
		]);
	});

	it("reads Pester and bats names, and nothing outside test files", () => {
		assert.deepEqual(extractTestNames("install.Tests.ps1", 'Describe "Instalador" {\n  It "crea el enlace" {}'), [
			{ line: 1, text: "Instalador" },
			{ line: 2, text: "crea el enlace" },
		]);
		assert.deepEqual(extractTestNames("tools/check.bats", '@test "falla sin enlace" {'), [{ line: 1, text: "falla sin enlace" }]);
		assert.deepEqual(extractTestNames("board.mjs", 'test("crea el archivo")'), []);
	});

	it("flags a Spanish test name and prints the exemptions also when it fails", () => {
		const repo = mkdtempSync(path.join(tmpdir(), "check-comments-"));
		try {
			execFileSync("git", ["init", "-q", repo]);
			writeFileSync(path.join(repo, "a.test.mjs"), 'test("crea el archivo de la carpeta", () => {});\n');
			execFileSync("git", ["-C", repo, "add", "a.test.mjs"]);
			const script = fileURLToPath(new URL("./check-comments.mjs", import.meta.url));
			assert.throws(
				() => execFileSync(process.execPath, [script, repo], { encoding: "utf8" }),
				(/** @type {any} */ error) =>
					error.status === 1 && /a\.test\.mjs:1 test name: crea/.test(error.stdout) && /^exempt: /m.test(error.stdout),
			);
		} finally {
			rmSync(repo, { recursive: true, force: true });
		}
	});
});

describe("Linux desktop files", () => {
	it("reads -- and --[[ ]] comments in Lua", () => {
		const lua = [
			"--[[ Atajos de la ventana",
			"  para el gestor. ]]",
			'local x = "-- no es comentario"',
			"local y = 1 -- valor de la prueba",
			"-- Sets the default gap.",
		].join("\n");
		assert.deepEqual(flagged("nvim/init.lua", lua), [1, 4]);
	});

	it("reads ; and # comments in .ini, as polybar uses them", () => {
		const ini = ["; Barra de la parte de arriba", "[bar/top]", "# Colores del tema", "width = 100%"].join("\n");
		assert.deepEqual(flagged("polybar/config.ini", ini), [1, 3]);
	});

	it("reads # in sxhkdrc and .conf, and // in .rasi", () => {
		assert.deepEqual(flagged("sxhkd/sxhkdrc", "# Abre la terminal con super"), [1]);
		assert.deepEqual(flagged("picom/picom.conf", "# Sombras de las ventanas"), [1]);
		assert.deepEqual(flagged("rofi/theme.rasi", "/* Colores del menú */\n// Fuente de la barra"), [1, 2]);
	});

	it("tells a script without extension by its shebang", () => {
		assert.deepEqual(flagged("bin/backup", "#!/usr/bin/env bash\n# Copia la carpeta de trabajo"), [2]);
		assert.deepEqual(flagged("bin/tool", "#!/usr/bin/env node\n// Lee la lista de tareas"), [2]);
		assert.deepEqual(flagged("bin/notes", "Lista de la compra"), []);
	});

	it("takes extra file types from the repo config", () => {
		const config = { styles: { slash: ["(^|/)xkb/symbols/"] } };
		assert.deepEqual(flagged("xkb/symbols/custom", "// Teclas de la distribución", config), [1]);
		assert.deepEqual(flagged("xkb/symbols/custom", "// Teclas de la distribución"), []);
	});
});
