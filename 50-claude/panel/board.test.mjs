// @ts-check
// Tests for the panel parser. Run with `node --test 50-claude/panel/board.test.mjs` (tools/check.ps1 does).
// The fixtures are Spanish, like `docs/tasks.md`; the labels are examples, since each repo sets
// its own in `.claude/panel.json`.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBoardData, computeItemId, listBoardProblems, listOpenRequirements, parsePlatforms, parsePriority, toSlug } from "./board.mjs";
import { computeSourceHash } from "./panel-files.mjs";

const LABELS = {
	platforms: { web: "App Web", site: "App Site", workbench: "Tool Workbench", repo: "Repositorio" },
	devices: { mobile: "Móvil", tablet: "Tableta", desktop: "Escritorio" },
};

const TASKS = [
	"# Tareas pendientes — Demo",
	"",
	"## Cómo se lee",
	"",
	"- Esto es preámbulo y no es un bloque.",
	"",
	"# Por probar",
	"",
	"## Login nuevo",
	"",
	"**Plataforma:** App Web.",
	"",
	"- [ ] Entrar con contraseña",
	"- [ ] [Móvil, Tableta] El menú se abre con el botón",
	"",
	"# Fase 1 — Base",
	"",
	"## Bloque A",
	"",
	"**Plataforma:** App Web y Repositorio.",
	"",
	"**Prioridad:** P1.",
	"",
	"**Requiere:** nada. Con plan:",
	"decidir el orden.",
	"",
	"**Estado:** en curso.",
	"",
	"Contexto del bloque.",
	"",
	"- [ ] Primera tarea",
	"- [ ] Segunda tarea partida",
	"  en dos líneas",
	"",
	"# Cierre — al final",
	"",
	"## Bloque B",
	"",
	"**Plataforma:** App Site.",
	"",
	"**Requiere:** «Bloque A».",
	"",
	"- [ ] Cerrar",
	"",
	"# Aplazado — con su evento",
	"",
	"Cada uno espera algo.",
	"",
	"- [ ] Algo aplazado",
	"",
].join("\n");

const BACKLOG = [
	"# Backlog — Demo",
	"",
	"### Diferido",
	"",
	"**Plataforma:** Tool Workbench.",
	"",
	"El porqué:",
	"",
	"- una razón",
	"- otra razón",
	"",
	"- [ ] Hacerlo",
	"",
].join("\n");

const SOURCES = { tasks: TASKS, backlog: BACKLOG };
const build = (sources = SOURCES, labels = LABELS) => buildBoardData({ ...sources, project: "demo", sourceHash: "abc", labels });
/** @param {string} tasks @param {string} [backlog] */
const messages = (tasks, backlog = BACKLOG) => listBoardProblems({ tasks, backlog }, LABELS).map((p) => p.message);
/** @param {string[]} list @param {string} part */
const hasMessage = (list, part) => assert.ok(list.some((m) => m.includes(part)), `missing «${part}» in: ${JSON.stringify(list)}`);

describe("buildBoardData", () => {
	const data = build();
	/** @param {string} id */
	const group = (id) => data.groups.find((g) => g.id === id);

	it("reads phases, blocks and tasks in .md order, with Por probar first and Backlog last", () => {
		assert.deepEqual(
			data.phases.map((p) => p.id),
			["test", "p1", "final-al-final", "later-con-su-evento", "backlog"],
		);
		assert.deepEqual(
			data.groups.map((g) => g.id),
			["login-nuevo", "bloque-a", "bloque-b", "aplazado-con-su-evento", "diferido"],
		);
	});

	it("the preamble is not a block", () => {
		assert.equal(
			data.groups.some((g) => g.title === "Cómo se lee"),
			false,
		);
	});

	it("reads platform, a multi-line requirement, state and prose", () => {
		const a = group("bloque-a");
		assert.equal(a?.phase, "p1");
		assert.deepEqual(a?.platforms, ["web", "repo"]);
		assert.equal(a?.priority, "p1");
		assert.equal(a?.requires, "nada. Con plan: decidir el orden.");
		assert.equal(a?.note, "Contexto del bloque.");
		assert.equal(a?.working, true);
	});

	it("joins a task split over several lines and fingerprints the whole text", () => {
		const second = group("bloque-a")?.items[1];
		assert.equal(second?.text, "Segunda tarea partida en dos líneas");
		assert.equal(second?.id, computeItemId("Segunda tarea partida en dos líneas"));
	});

	it("reads the device of a Por probar checkbox and drops it from the text and fingerprint", () => {
		const [all, tagged] = group("login-nuevo")?.items ?? [];
		assert.equal(all?.text, "Entrar con contraseña");
		assert.deepEqual(all?.devices, []);
		assert.deepEqual(tagged, {
			id: computeItemId("El menú se abre con el botón"),
			text: "El menú se abre con el botón",
			devices: ["mobile", "tablet"],
		});
	});

	it("loose tasks in a phase form a block named after the phase, with no platforms", () => {
		const later = group("aplazado-con-su-evento");
		assert.equal(later?.phase, "later-con-su-evento");
		assert.deepEqual(later?.platforms, []);
		assert.equal(later?.note, "Cada uno espera algo.");
		assert.equal(later?.items[0]?.text, "Algo aplazado");
	});

	it("in the backlog, each prose bullet is its own paragraph", () => {
		assert.equal(group("diferido")?.note, "El porqué:\n\n- una razón\n\n- otra razón");
		assert.equal(group("diferido")?.phase, "backlog");
	});

	it("an open requirement blocks; one that only waits to be tested does not", () => {
		assert.deepEqual(group("bloque-b")?.blockedBy, ["Bloque A"]);
	});

	it("the track marks as current the phase of the block being worked on", () => {
		assert.deepEqual(data.track, [
			{ label: "Fase 1", name: "Base", status: "now" },
			{ label: "Cierre", name: "al final", status: "todo" },
		]);
	});

	it("the data carries the repo's labels so the page names none", () => {
		assert.deepEqual(data.platforms, Object.entries(LABELS.platforms));
		assert.deepEqual(data.devices, Object.entries(LABELS.devices));
		assert.deepEqual(
			data.priorities.map(([id]) => id),
			["p0", "p1", "p2", "improvement"],
		);
	});

	it("a task's fingerprint survives moving it or deleting its neighbors", () => {
		const moved = build({ tasks: TASKS.replace("- [ ] Primera tarea\n", ""), backlog: BACKLOG });
		const before = group("bloque-a")?.items[1]?.id;
		assert.equal(moved.groups.find((g) => g.id === "bloque-a")?.items[0]?.id, before);
	});

	it("two sections with the same prefix are two phases, each with its blocks", () => {
		const twoBlocked = build({
			tasks: [
				"# Tareas",
				"",
				"# Bloqueado por terceros — Proveedor",
				"",
				"## Fotos",
				"",
				"- [ ] Ponerlas",
				"",
				"# Bloqueado por terceros — Dependencias",
				"",
				"## Paquete",
				"",
				"- [ ] Subirlo",
				"",
			].join("\n"),
			backlog: "# Backlog\n",
		});
		assert.deepEqual(
			twoBlocked.phases.map((p) => p.id),
			["test", "blocked-proveedor", "blocked-dependencias", "backlog"],
		);
		assert.deepEqual(
			twoBlocked.groups.map((g) => [g.id, g.phase]),
			[
				["fotos", "blocked-proveedor"],
				["paquete", "blocked-dependencias"],
			],
		);
	});

	it("empty .md files give an empty panel with no problems", () => {
		const empty = { tasks: "# Tareas\n", backlog: "# Backlog\n" };
		assert.deepEqual(listBoardProblems(empty, LABELS), []);
		assert.deepEqual(build(empty).groups, []);
	});
});

describe("listBoardProblems", () => {
	it("the sample format has no problems", () => {
		assert.deepEqual(listBoardProblems(SOURCES, LABELS), []);
	});

	it("a task checked as done is an error: finished work is deleted", () => {
		hasMessage(messages(TASKS.replace("- [ ] Cerrar", "- [x] Cerrar")), "task checked as done");
	});

	it("a block without platform, requirement or tasks is an error", () => {
		const broken = TASKS.replace("**Plataforma:** App Site.\n", "")
			.replace("**Requiere:** «Bloque A».\n", "")
			.replace("- [ ] Cerrar\n", "");
		const found = messages(broken);
		hasMessage(found, "missing **Plataforma:** line");
		hasMessage(found, "missing **Requiere:** line");
		hasMessage(found, "block without tasks");
	});

	it("without configured platforms the platform line is not required", () => {
		const noPlatforms = { platforms: {}, devices: LABELS.devices };
		const tasks = TASKS.replaceAll(/\*\*Plataforma:\*\* [^\n]+\n/g, "");
		const backlog = BACKLOG.replace("**Plataforma:** Tool Workbench.\n", "");
		assert.deepEqual(listBoardProblems({ tasks, backlog }, noPlatforms), []);
	});

	it("the backlog does not require a requirement line", () => {
		assert.deepEqual(messages(TASKS, BACKLOG), []);
	});

	it("an unknown platform, phase or state is an error", () => {
		hasMessage(messages(TASKS.replace("App Site.", "App Móvil.")), "unknown platform «App Móvil»");
		hasMessage(messages(TASKS.replace("# Cierre — al final", "# Extra")), "unknown phase «Extra»");
		hasMessage(messages(TASKS.replace("**Estado:** en curso.", "**Estado:** pausado.")), "unknown state «pausado.»");
	});

	it("in Por probar, a block without platform or an unknown device is an error", () => {
		hasMessage(messages(TASKS.replace("**Plataforma:** App Web.\n", "")), "«Login nuevo»: missing **Plataforma:** line");
		hasMessage(messages(TASKS.replace("[Móvil, Tableta]", "[Móvil, Reloj]")), "unknown device «Reloj»");
	});

	it("a device only goes in Por probar; other leading brackets are text", () => {
		hasMessage(messages(TASKS.replace("- [ ] Cerrar", "- [ ] [Escritorio] Cerrar")), "a device only goes in «Por probar» checkboxes");
		assert.deepEqual(messages(TASKS.replace("- [ ] Cerrar", "- [ ] [Opcional] Cerrar")), []);
	});

	it("two blocks in progress at once is an error", () => {
		const twice = TASKS.replace("**Requiere:** «Bloque A».", "**Requiere:** «Bloque A».\n\n**Estado:** en curso.");
		hasMessage(messages(twice), "2 blocks «en curso»");
	});

	it("what waits to be tested is never marked in progress", () => {
		const testing = TASKS.replace("## Login nuevo\n", "## Login nuevo\n\n**Estado:** en curso.\n");
		hasMessage(messages(testing), "what waits to be tested is never marked «en curso»");
	});

	it("a phase without blocks and a repeated task are errors", () => {
		hasMessage(messages(`${TASKS}\n# Fase 2 — Vacía\n`), "phase «Fase 2: Vacía» has no blocks");
		hasMessage(messages(TASKS.replace("- [ ] Cerrar", "- [ ] Cerrar\n- [ ] Cerrar")), "repeated task");
	});

	it("a numbered-phase block with no priority, or an unknown one, is an error", () => {
		hasMessage(messages(TASKS.replace("**Prioridad:** P1.\n", "")), "missing **Prioridad:** line");
		hasMessage(messages(TASKS.replace("P1.", "Urgente.")), "unknown priority «Urgente.»");
	});

	it("within a phase, a more severe block after a less severe one is an error", () => {
		const extra = "## Bloque C\n\n**Plataforma:** App Web.\n\n**Prioridad:** P0.\n\n**Requiere:** nada.\n\n- [ ] Arreglar\n\n# Cierre";
		hasMessage(messages(TASKS.replace("# Cierre", extra)), "P0 comes after «Bloque A» (P1)");
	});

	it("a priority only goes in numbered phases", () => {
		const closing = TASKS.replace("**Requiere:** «Bloque A».", "**Prioridad:** P2.\n\n**Requiere:** «Bloque A».");
		hasMessage(messages(closing), "a priority only goes in the blocks of a numbered phase");
	});

	it("two titles that give the same id are an error", () => {
		const backlog = `${BACKLOG}\n### Bloque A!\n\n**Plataforma:** App Web.\n\n- [ ] Otra\n`;
		hasMessage(messages(TASKS, backlog), "is named almost like");
	});
});

describe("helpers", () => {
	it("toSlug drops accents and punctuation", () => {
		assert.equal(toSlug("Organización 3: ajustes que faltan"), "organizacion-3-ajustes-que-faltan");
	});

	it("parsePlatforms accepts commas and «y», and sets aside what it does not know", () => {
		assert.deepEqual(parsePlatforms("Repositorio, App Web y App Site.", LABELS.platforms), {
			platforms: ["repo", "web", "site"],
			unknown: [],
		});
		assert.deepEqual(parsePlatforms("App Web, Móvil", LABELS.platforms), { platforms: ["web"], unknown: ["Móvil"] });
	});

	it("parsePriority accepts the name with or without a period, case-insensitively", () => {
		assert.equal(parsePriority("P0."), "p0");
		assert.equal(parsePriority("mejora"), "improvement");
		assert.equal(parsePriority("P3"), null);
	});

	it("a requirement blocks only while its block is still open", () => {
		const open = new Set(["Modelo de datos"]);
		assert.deepEqual(listOpenRequirements("«Modelo de datos» y «Ya cerrado».", open), ["Modelo de datos"]);
		assert.deepEqual(listOpenRequirements("Con plan.", open), []);
		assert.deepEqual(listOpenRequirements(null, open), []);
	});

	it("the .md fingerprint ignores CRLF versus LF and changes with the content", () => {
		assert.equal(computeSourceHash("a\r\nb", "c"), computeSourceHash("a\nb", "c"));
		assert.notEqual(computeSourceHash("a", "b"), computeSourceHash("a", "c"));
		assert.notEqual(computeSourceHash("ab", ""), computeSourceHash("a", "b"));
	});
});
