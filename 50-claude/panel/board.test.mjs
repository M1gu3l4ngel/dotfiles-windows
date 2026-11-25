// @ts-check
// Tests del parser del panel. Corre con `node --test claude/panel/` (lo hace tools/check.ps1).
// Las etiquetas son de ejemplo: cada repo pone las suyas en `.claude/panel.json`.

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
const hasMessage = (list, part) => assert.ok(list.some((m) => m.includes(part)), `falta «${part}» en: ${JSON.stringify(list)}`);

describe("buildBoardData", () => {
	const data = build();
	/** @param {string} id */
	const group = (id) => data.groups.find((g) => g.id === id);

	it("lee fases, bloques y tareas en el orden de los .md, con Por probar primero y Backlog al final", () => {
		assert.deepEqual(
			data.phases.map((p) => p.id),
			["test", "p1", "final-al-final", "later-con-su-evento", "backlog"],
		);
		assert.deepEqual(
			data.groups.map((g) => g.id),
			["login-nuevo", "bloque-a", "bloque-b", "aplazado-con-su-evento", "diferido"],
		);
	});

	it("el preámbulo no es un bloque", () => {
		assert.equal(
			data.groups.some((g) => g.title === "Cómo se lee"),
			false,
		);
	});

	it("lee plataforma, requisito de varias líneas, estado y prosa", () => {
		const a = group("bloque-a");
		assert.equal(a?.phase, "p1");
		assert.deepEqual(a?.platforms, ["web", "repo"]);
		assert.equal(a?.priority, "p1");
		assert.equal(a?.requires, "nada. Con plan: decidir el orden.");
		assert.equal(a?.note, "Contexto del bloque.");
		assert.equal(a?.working, true);
	});

	it("une la tarea partida en varias líneas y le da la huella del texto entero", () => {
		const second = group("bloque-a")?.items[1];
		assert.equal(second?.text, "Segunda tarea partida en dos líneas");
		assert.equal(second?.id, computeItemId("Segunda tarea partida en dos líneas"));
	});

	it("lee el dispositivo de una casilla de Por probar y lo quita del texto y de la huella", () => {
		const [all, tagged] = group("login-nuevo")?.items ?? [];
		assert.equal(all?.text, "Entrar con contraseña");
		assert.deepEqual(all?.devices, []);
		assert.deepEqual(tagged, {
			id: computeItemId("El menú se abre con el botón"),
			text: "El menú se abre con el botón",
			devices: ["mobile", "tablet"],
		});
	});

	it("las tareas sueltas de una fase forman un bloque con el nombre de la fase y sin plataformas", () => {
		const later = group("aplazado-con-su-evento");
		assert.equal(later?.phase, "later-con-su-evento");
		assert.deepEqual(later?.platforms, []);
		assert.equal(later?.note, "Cada uno espera algo.");
		assert.equal(later?.items[0]?.text, "Algo aplazado");
	});

	it("en el backlog, cada viñeta de la prosa es su propio párrafo", () => {
		assert.equal(group("diferido")?.note, "El porqué:\n\n- una razón\n\n- otra razón");
		assert.equal(group("diferido")?.phase, "backlog");
	});

	it("un requisito abierto bloquea; lo que solo está por probar no", () => {
		assert.deepEqual(group("bloque-b")?.blockedBy, ["Bloque A"]);
	});

	it("el recorrido marca en curso la fase del bloque que se trabaja", () => {
		assert.deepEqual(data.track, [
			{ label: "Fase 1", name: "Base", status: "now" },
			{ label: "Cierre", name: "al final", status: "todo" },
		]);
	});

	it("los datos llevan las etiquetas del repo para que la página no nombre ninguna", () => {
		assert.deepEqual(data.platforms, Object.entries(LABELS.platforms));
		assert.deepEqual(data.devices, Object.entries(LABELS.devices));
		assert.deepEqual(
			data.priorities.map(([id]) => id),
			["p0", "p1", "p2", "improvement"],
		);
	});

	it("la huella de una tarea no cambia al moverla ni al borrar sus vecinas", () => {
		const moved = build({ tasks: TASKS.replace("- [ ] Primera tarea\n", ""), backlog: BACKLOG });
		const before = group("bloque-a")?.items[1]?.id;
		assert.equal(moved.groups.find((g) => g.id === "bloque-a")?.items[0]?.id, before);
	});

	it("dos secciones con el mismo prefijo son dos fases, cada una con sus bloques", () => {
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

	it("los .md vacíos dan un panel vacío y sin problemas", () => {
		const empty = { tasks: "# Tareas\n", backlog: "# Backlog\n" };
		assert.deepEqual(listBoardProblems(empty, LABELS), []);
		assert.deepEqual(build(empty).groups, []);
	});
});

describe("listBoardProblems", () => {
	it("el formato de ejemplo no tiene problemas", () => {
		assert.deepEqual(listBoardProblems(SOURCES, LABELS), []);
	});

	it("una tarea marcada como hecha es un error: lo hecho se borra", () => {
		hasMessage(messages(TASKS.replace("- [ ] Cerrar", "- [x] Cerrar")), "tarea marcada como hecha");
	});

	it("un bloque sin plataforma, sin requisito o sin tareas es un error", () => {
		const broken = TASKS.replace("**Plataforma:** App Site.\n", "")
			.replace("**Requiere:** «Bloque A».\n", "")
			.replace("- [ ] Cerrar\n", "");
		const found = messages(broken);
		hasMessage(found, "falta la línea **Plataforma:**");
		hasMessage(found, "falta la línea **Requiere:**");
		hasMessage(found, "bloque sin tareas");
	});

	it("sin plataformas configuradas no se exige la línea de plataforma", () => {
		const noPlatforms = { platforms: {}, devices: LABELS.devices };
		const tasks = TASKS.replaceAll(/\*\*Plataforma:\*\* [^\n]+\n/g, "");
		const backlog = BACKLOG.replace("**Plataforma:** Tool Workbench.\n", "");
		assert.deepEqual(listBoardProblems({ tasks, backlog }, noPlatforms), []);
	});

	it("el backlog no exige requisito", () => {
		assert.deepEqual(messages(TASKS, BACKLOG), []);
	});

	it("una plataforma, una fase o un estado desconocidos son errores", () => {
		hasMessage(messages(TASKS.replace("App Site.", "App Móvil.")), "plataforma desconocida «App Móvil»");
		hasMessage(messages(TASKS.replace("# Cierre — al final", "# Extra")), "fase desconocida «Extra»");
		hasMessage(messages(TASKS.replace("**Estado:** en curso.", "**Estado:** pausado.")), "estado desconocido «pausado.»");
	});

	it("en Por probar, un bloque sin plataforma o un dispositivo desconocido son errores", () => {
		hasMessage(messages(TASKS.replace("**Plataforma:** App Web.\n", "")), "«Login nuevo»: falta la línea **Plataforma:**");
		hasMessage(messages(TASKS.replace("[Móvil, Tableta]", "[Móvil, Reloj]")), "dispositivo desconocido «Reloj»");
	});

	it("el dispositivo solo va en Por probar; otros corchetes al principio son texto", () => {
		hasMessage(messages(TASKS.replace("- [ ] Cerrar", "- [ ] [Escritorio] Cerrar")), "el dispositivo solo va en las casillas de «Por probar»");
		assert.deepEqual(messages(TASKS.replace("- [ ] Cerrar", "- [ ] [Opcional] Cerrar")), []);
	});

	it("dos bloques en curso a la vez es un error", () => {
		const twice = TASKS.replace("**Requiere:** «Bloque A».", "**Requiere:** «Bloque A».\n\n**Estado:** en curso.");
		hasMessage(messages(twice), "2 bloques en curso");
	});

	it("lo que está por probar no se marca en curso", () => {
		const testing = TASKS.replace("## Login nuevo\n", "## Login nuevo\n\n**Estado:** en curso.\n");
		hasMessage(messages(testing), "lo que está por probar no se marca en curso");
	});

	it("una fase sin bloques y una tarea repetida son errores", () => {
		hasMessage(messages(`${TASKS}\n# Fase 2 — Vacía\n`), "«Fase 2: Vacía» no tiene bloques");
		hasMessage(messages(TASKS.replace("- [ ] Cerrar", "- [ ] Cerrar\n- [ ] Cerrar")), "tarea repetida");
	});

	it("un bloque de una fase numerada sin prioridad, o con una desconocida, es un error", () => {
		hasMessage(messages(TASKS.replace("**Prioridad:** P1.\n", "")), "falta la línea **Prioridad:**");
		hasMessage(messages(TASKS.replace("P1.", "Urgente.")), "prioridad desconocida «Urgente.»");
	});

	it("dentro de una fase, un bloque más grave detrás de otro menos grave es un error", () => {
		const extra = "## Bloque C\n\n**Plataforma:** App Web.\n\n**Prioridad:** P0.\n\n**Requiere:** nada.\n\n- [ ] Arreglar\n\n# Cierre";
		hasMessage(messages(TASKS.replace("# Cierre", extra)), "P0 va detrás de «Bloque A» (P1)");
	});

	it("la prioridad solo va en las fases numeradas", () => {
		const closing = TASKS.replace("**Requiere:** «Bloque A».", "**Prioridad:** P2.\n\n**Requiere:** «Bloque A».");
		hasMessage(messages(closing), "la prioridad solo va en los bloques de una fase numerada");
	});

	it("dos títulos que dan el mismo id son un error", () => {
		const backlog = `${BACKLOG}\n### Bloque A!\n\n**Plataforma:** App Web.\n\n- [ ] Otra\n`;
		hasMessage(messages(TASKS, backlog), "se llama casi igual");
	});
});

describe("piezas sueltas", () => {
	it("toSlug quita acentos y signos", () => {
		assert.equal(toSlug("Organización 3: ajustes que faltan"), "organizacion-3-ajustes-que-faltan");
	});

	it("parsePlatforms acepta comas y «y», y separa lo que no conoce", () => {
		assert.deepEqual(parsePlatforms("Repositorio, App Web y App Site.", LABELS.platforms), {
			platforms: ["repo", "web", "site"],
			unknown: [],
		});
		assert.deepEqual(parsePlatforms("App Web, Móvil", LABELS.platforms), { platforms: ["web"], unknown: ["Móvil"] });
	});

	it("parsePriority acepta el nombre con o sin punto y sin distinguir mayúsculas", () => {
		assert.equal(parsePriority("P0."), "p0");
		assert.equal(parsePriority("mejora"), "improvement");
		assert.equal(parsePriority("P3"), null);
	});

	it("un requisito bloquea solo mientras su bloque sigue abierto", () => {
		const open = new Set(["Modelo de datos"]);
		assert.deepEqual(listOpenRequirements("«Modelo de datos» y «Ya cerrado».", open), ["Modelo de datos"]);
		assert.deepEqual(listOpenRequirements("Con plan.", open), []);
		assert.deepEqual(listOpenRequirements(null, open), []);
	});

	it("la huella de los .md no distingue CRLF de LF y cambia con el contenido", () => {
		assert.equal(computeSourceHash("a\r\nb", "c"), computeSourceHash("a\nb", "c"));
		assert.notEqual(computeSourceHash("a", "b"), computeSourceHash("a", "c"));
		assert.notEqual(computeSourceHash("ab", ""), computeSourceHash("a", "b"));
	});
});
