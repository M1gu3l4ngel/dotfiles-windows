// @ts-check
// Lee `docs/tasks.md` y `docs/backlog.md` y los convierte en los datos del panel.
//
// El panel no se escribe a mano: es una vista de estos dos archivos. Copiado a mano, el texto se
// resumía, perdía detalle y se desalineaba sin que nada lo detectara. Aquí el texto de cada tarea
// pasa tal cual, y lo que el análisis no sabe leer sale como problema de formato
// (`listBoardProblems`): nada se pierde en silencio.
//
// Las plataformas y los dispositivos los define cada repo en `.claude/panel.json`; las
// prioridades y las fases con nombre son las mismas en todos. El formato lo describe el README
// de esta carpeta.

import { createHash } from "node:crypto";
import { BACKLOG_FILE, TASKS_FILE } from "./panel-files.mjs";

/** Prioridades en el orden en que se trabajan: P0 seguridad o pérdida de datos, P1 comportamiento incorrecto, P2 incumple una regla, Mejora. */
export const PRIORITY_LABELS = /** @type {const} */ ({ p0: "P0", p1: "P1", p2: "P2", improvement: "Mejora" });
const PRIORITY_ORDER = Object.keys(PRIORITY_LABELS);

/** Fases que no son `Fase N`: su título en el `.md`, su id en el panel y si salen en el recorrido. */
const NAMED_PHASES = [
	{ prefix: "Por probar", id: "test", inTrack: false },
	{ prefix: "Cierre", id: "final", inTrack: true },
	{ prefix: "Lo hace el dueño", id: "owner", inTrack: false },
	{ prefix: "Aplazado", id: "later", inTrack: false },
	{ prefix: "Bloqueado por terceros", id: "blocked", inTrack: false },
];
export const TEST_PHASE = "test";
export const BACKLOG_PHASE = "backlog";
const WORKING_STATE = "en curso";

const NUMBERED_PHASE_RE = /^Fase (\d+) — (.+)$/;
const CHECKED_ITEM_RE = /^- \[[xX]\] /;
const OPEN_ITEM_RE = /^- \[ \] (.*)$/;
const FIELD_RE = /^\*\*(Plataforma|Prioridad|Requiere|Estado):\*\*\s*(.*)$/;
const DEVICE_TAG_RE = /^\[([^\]]+)\]\s+(.*)$/;

/**
 * @typedef {object} BoardItem
 * @property {string} id Huella del texto sin la etiqueta de dispositivo: la marca sobrevive a que se muevan otras.
 * @property {string} text
 * @property {string[]} devices Vacío: se prueba en cualquiera.
 *
 * @typedef {object} BoardGroup
 * @property {string} id
 * @property {string} phase
 * @property {string} title
 * @property {string[]} platforms
 * @property {string | null} priority
 * @property {string | null} requires
 * @property {string | null} note
 * @property {boolean} working
 * @property {string[]} blockedBy Los bloques de su «Requiere» que siguen abiertos.
 * @property {BoardItem[]} items
 *
 * @typedef {{ id: string, label: string }} BoardPhase
 * @typedef {{ label: string, name: string, status: "now" | "todo" }} BoardTrackStep
 * @typedef {{ file: string, line: number, message: string }} BoardProblem
 *
 * @typedef {object} Labels
 * @property {Record<string, string>} platforms
 * @property {Record<string, string>} devices
 *
 * @typedef {{ tasks: string, backlog: string }} BoardSources
 *
 * @typedef {BoardPhase & { inTrack: boolean, trackLabel: string, trackName: string, line: number }} ParsedPhase
 * @typedef {BoardGroup & { line: number, hasPlatform: boolean, hasRequires: boolean, noteLines: string[] }} ParsedGroup
 */

/**
 * Id legible y estable a partir de un título: sin acentos, sin signos, en minúsculas.
 * @param {string} text
 */
export function toSlug(text) {
	return text
		.normalize("NFD")
		.replaceAll(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replaceAll(/[^a-z0-9]+/g, "-")
		.replaceAll(/^-|-$/g, "")
		.slice(0, 60);
}

/** @param {string} text */
export function computeItemId(text) {
	return createHash("sha256").update(text.trim()).digest("hex").slice(0, 10);
}

/**
 * Nombres separados por comas o «y» → sus ids; lo que no reconoce va a `unknown`.
 * @param {string} value
 * @param {Record<string, string>} labels
 */
function parseLabelList(value, labels) {
	const byLabel = new Map(Object.entries(labels).map(([id, label]) => [label.toLowerCase(), id]));
	/** @type {string[]} */
	const ids = [];
	/** @type {string[]} */
	const unknown = [];
	const names = value
		.replace(/\.$/, "")
		.split(/,\s*|\s+y\s+/)
		.map((name) => name.trim())
		.filter(Boolean);
	for (const name of names) {
		const id = byLabel.get(name.toLowerCase());
		if (id) ids.push(id);
		else unknown.push(name);
	}
	return { ids, unknown };
}

/**
 * `Instalación y Shell.` → sus ids; lo que no reconoce va a `unknown`.
 * @param {string} value
 * @param {Record<string, string>} labels
 */
export function parsePlatforms(value, labels) {
	const { ids, unknown } = parseLabelList(value, labels);
	return { platforms: ids, unknown };
}

/**
 * `[Esta PC] El prompt…` → sus dispositivos y el texto sin la etiqueta. Sin etiqueta, o sin
 * dispositivos configurados, el texto queda tal cual.
 * @param {string} text
 * @param {Record<string, string>} labels
 */
export function parseDeviceTag(text, labels) {
	const match = DEVICE_TAG_RE.exec(text);
	if (!match || Object.keys(labels).length === 0) return { devices: [], text, unknown: [] };
	const { ids, unknown } = parseLabelList(match[1] ?? "", labels);
	return { devices: ids, text: match[2] ?? "", unknown };
}

/**
 * `P1.` o `Mejora` → su id; `null` si no es ninguna.
 * @param {string} value
 */
export function parsePriority(value) {
	const label = value.replace(/\.$/, "").trim().toLowerCase();
	return PRIORITY_ORDER.find((id) => PRIORITY_LABELS[/** @type {keyof typeof PRIORITY_LABELS} */ (id)].toLowerCase() === label) ?? null;
}

/** @param {string} phaseId */
const isNumberedPhase = (phaseId) => /^p\d+$/.test(phaseId);

/**
 * @param {string} heading
 * @param {number} line
 * @returns {ParsedPhase | null}
 */
function parsePhaseHeading(heading, line) {
	const numbered = NUMBERED_PHASE_RE.exec(heading);
	if (numbered) {
		const [, number = "", name = ""] = numbered;
		return { id: `p${number}`, label: `Fase ${number}: ${name}`, inTrack: true, trackLabel: `Fase ${number}`, trackName: name, line };
	}
	const named = NAMED_PHASES.find((phase) => heading === phase.prefix || heading.startsWith(`${phase.prefix} — `));
	if (!named) return null;
	const rest = heading.slice(named.prefix.length).replace(/^ — /, "");
	return {
		// Con su nombre en el id: puede haber dos «Bloqueado por terceros», y el panel agrupa por id.
		id: rest ? `${named.id}-${toSlug(rest)}` : named.id,
		label: rest ? `${named.prefix}: ${rest}` : named.prefix,
		inTrack: named.inTrack,
		trackLabel: named.prefix,
		trackName: rest,
		line,
	};
}

/**
 * @param {string} phase
 * @param {string} title
 * @param {number} line
 * @returns {ParsedGroup}
 */
function createGroup(phase, title, line) {
	return {
		id: toSlug(title),
		phase,
		title,
		platforms: [],
		priority: null,
		requires: null,
		note: null,
		working: false,
		blockedBy: [],
		items: [],
		line,
		hasPlatform: false,
		hasRequires: false,
		noteLines: [],
	};
}

/**
 * Une las líneas de prosa de un bloque en párrafos, como los pinta el `.md`: cada viñeta, el suyo.
 * @param {readonly string[]} lines
 */
function toNoteParagraphs(lines) {
	/** @type {string[]} */
	const paragraphs = [];
	/** @type {string[]} */
	let current = [];
	for (const line of lines) {
		const startsBullet = line.startsWith("- ");
		if (line.trim() === "" || startsBullet) {
			if (current.length > 0) paragraphs.push(current.join(" "));
			current = startsBullet ? [line.trim()] : [];
		} else {
			current.push(line.trim());
		}
	}
	if (current.length > 0) paragraphs.push(current.join(" "));
	return paragraphs.length > 0 ? paragraphs.join("\n\n") : null;
}

/**
 * Recorre un `.md` y devuelve sus fases y bloques, con lo que no supo leer.
 * @param {string} source
 * @param {{ file: string, blockLevel: 2 | 3, fixedPhase?: string, labels: Labels }} options
 */
function parseFile(source, options) {
	const lines = source.replaceAll("\r\n", "\n").split("\n");
	/** @type {ParsedPhase[]} */
	const phases = [];
	/** @type {ParsedGroup[]} */
	const groups = [];
	/** @type {BoardProblem[]} */
	const problems = [];
	/** @param {number} line @param {string} message */
	const report = (line, message) => problems.push({ file: options.file, line, message });
	const blockPrefix = `${"#".repeat(options.blockLevel)} `;
	const { platforms: platformLabels, devices: deviceLabels } = options.labels;

	/** @type {ParsedPhase | null} */
	let phase = null;
	/** @type {string[]} */
	let phaseNote = [];
	/** @type {ParsedGroup | null} */
	let group = null;
	// El primer `#` es el título del archivo: lo que cuelga de él (cómo se lee) no es una fase.
	let seenTitle = false;
	/** @type {BoardItem | null} */
	let lastItem = null;
	// El valor de `**Requiere:**` puede seguir en las líneas siguientes hasta el párrafo vacío.
	let readingRequires = false;

	lines.forEach((raw, index) => {
		const lineNumber = index + 1;
		const line = raw.trimEnd();

		if (line.startsWith("# ")) {
			group = null;
			lastItem = null;
			readingRequires = false;
			if (!seenTitle) {
				seenTitle = true;
				return;
			}
			if (options.fixedPhase) {
				report(lineNumber, `título de nivel 1 de más: «${line}»`);
				return;
			}
			phase = parsePhaseHeading(line.slice(2), lineNumber);
			phaseNote = [];
			if (phase) phases.push(phase);
			else
				report(
					lineNumber,
					`fase desconocida «${line.slice(2)}»: usa «Fase N — nombre», «Por probar», «Cierre», «Lo hace el dueño», «Aplazado» o «Bloqueado por terceros»`,
				);
			return;
		}

		const phaseId = options.fixedPhase ?? /** @type {ParsedPhase | null} */ (phase)?.id;
		if (line.startsWith(blockPrefix)) {
			lastItem = null;
			readingRequires = false;
			group = phaseId ? createGroup(phaseId, line.slice(blockPrefix.length), lineNumber) : null;
			if (group) groups.push(group);
			return;
		}
		if (/^#{2,6} /.test(line)) {
			if (phaseId) report(lineNumber, `título de nivel inesperado: «${line}»`);
			return;
		}
		if (!phaseId || line === "---") return;

		if (CHECKED_ITEM_RE.test(line)) {
			report(lineNumber, "tarea marcada como hecha: lo hecho se borra, no se marca");
			return;
		}

		const item = OPEN_ITEM_RE.exec(line);
		if (item) {
			readingRequires = false;
			// Tareas sueltas bajo la fase (Aplazado, Bloqueado): la fase hace de bloque.
			const currentPhase = /** @type {ParsedPhase | null} */ (phase);
			if (!group && currentPhase) {
				const phaseGroup = createGroup(phaseId, currentPhase.label, currentPhase.line);
				phaseGroup.noteLines = phaseNote;
				phaseGroup.hasPlatform = true;
				phaseGroup.hasRequires = true;
				group = phaseGroup;
				groups.push(phaseGroup);
			}
			const target = /** @type {ParsedGroup | null} */ (group);
			if (!target) return;
			const text = (item[1] ?? "").trim();
			let tagged = parseDeviceTag(text, deviceLabels);
			if (phaseId === TEST_PHASE) {
				for (const label of tagged.unknown)
					report(lineNumber, `dispositivo desconocido «${label}»: usa ${Object.values(deviceLabels).join(", ")}`);
			} else {
				// Fuera de «Por probar» unos corchetes al principio son texto de la tarea; solo se
				// avisa si son, de verdad, una etiqueta de dispositivo.
				if (tagged.devices.length > 0) report(lineNumber, "el dispositivo solo va en las casillas de «Por probar»");
				tagged = { devices: [], text, unknown: [] };
			}
			/** @type {BoardItem} */
			const created = { id: computeItemId(tagged.text), text: tagged.text, devices: tagged.devices };
			lastItem = created;
			target.items.push(created);
			return;
		}
		// Continuación de una tarea larga partida en varias líneas.
		const previousItem = /** @type {BoardItem | null} */ (lastItem);
		if (previousItem && /^\s{2,}\S/.test(raw)) {
			previousItem.text = `${previousItem.text} ${line.trim()}`;
			previousItem.id = computeItemId(previousItem.text);
			return;
		}
		lastItem = null;

		const current = /** @type {ParsedGroup | null} */ (group);
		const field = FIELD_RE.exec(line);
		if (field && current) {
			const [, name, value = ""] = field;
			readingRequires = false;
			if (name === "Plataforma") {
				const { platforms, unknown } = parsePlatforms(value, platformLabels);
				current.platforms = platforms;
				current.hasPlatform = true;
				for (const label of unknown)
					report(lineNumber, `plataforma desconocida «${label}»: usa ${Object.values(platformLabels).join(", ")}`);
			} else if (name === "Prioridad") {
				current.priority = parsePriority(value);
				if (!current.priority)
					report(lineNumber, `prioridad desconocida «${value}»: usa ${Object.values(PRIORITY_LABELS).join(", ")}`);
			} else if (name === "Requiere") {
				current.requires = value.trim();
				current.hasRequires = true;
				readingRequires = true;
			} else if (value.replace(/\.$/, "").trim().toLowerCase() === WORKING_STATE) {
				current.working = true;
			} else {
				report(lineNumber, `estado desconocido «${value}»: el único es «${WORKING_STATE}»`);
			}
			return;
		}
		if (readingRequires && current && line.trim() !== "") {
			current.requires = `${current.requires ?? ""} ${line.trim()}`.trim();
			return;
		}
		readingRequires = false;
		if (current) current.noteLines.push(line);
		else phaseNote.push(line);
	});

	return { phases, groups, problems };
}

/**
 * Los títulos entre comillas latinas de un «Requiere» que siguen siendo un bloque abierto. Un
 * bloque cerrado se borra del `.md`, así que lo que ya no está como bloque ya no bloquea.
 * @param {string | null} requires
 * @param {ReadonlySet<string>} openTitles
 */
export function listOpenRequirements(requires, openTitles) {
	if (!requires) return [];
	return [...requires.matchAll(/«([^»]+)»/g)].map((match) => match[1] ?? "").filter((title) => openTitles.has(title));
}

/**
 * @param {readonly ParsedGroup[]} parsed
 * @param {ReadonlySet<string>} openTitles
 * @returns {BoardGroup[]}
 */
function toBoardGroups(parsed, openTitles) {
	return parsed.map((group) => ({
		id: group.id,
		phase: group.phase,
		title: group.title,
		platforms: group.platforms,
		priority: group.priority,
		requires: group.requires,
		note: toNoteParagraphs(group.noteLines),
		working: group.working,
		blockedBy: listOpenRequirements(group.requires, openTitles),
		items: group.items,
	}));
}

/**
 * Lo que el formato exige y el análisis no puede arreglar solo.
 * @param {string} file
 * @param {readonly ParsedGroup[]} groups
 * @param {{ needsRequires: boolean, needsPlatform: boolean }} rules
 */
function listGroupProblems(file, groups, rules) {
	/** @type {BoardProblem[]} */
	const problems = [];
	// La prioridad del bloque anterior de la misma fase: dentro de una fase van de P0 a Mejora.
	/** @type {ParsedGroup | null} */
	let previous = null;
	for (const group of groups) {
		/** @param {string} message */
		const report = (message) => problems.push({ file, line: group.line, message: `«${group.title}»: ${message}` });
		if (group.items.length === 0) report("bloque sin tareas: si se vació, se borra");
		if (rules.needsPlatform && !group.hasPlatform) report("falta la línea **Plataforma:**");
		if (group.phase === TEST_PHASE) {
			if (group.working) report("lo que está por probar no se marca en curso");
			continue;
		}
		if (rules.needsRequires && !group.hasRequires) report("falta la línea **Requiere:**");
		if (isNumberedPhase(group.phase)) {
			const prev = /** @type {ParsedGroup | null} */ (previous);
			if (!group.priority) report("falta la línea **Prioridad:**");
			else if (
				prev?.phase === group.phase &&
				prev.priority &&
				PRIORITY_ORDER.indexOf(group.priority) < PRIORITY_ORDER.indexOf(prev.priority)
			)
				report(
					`${labelOf(group.priority)} va detrás de «${prev.title}» (${labelOf(prev.priority)}): dentro de una fase, de P0 a Mejora`,
				);
			previous = group;
		} else if (group.priority) {
			report("la prioridad solo va en los bloques de una fase numerada");
		}
		const seen = new Set();
		for (const item of group.items) {
			if (seen.has(item.id)) report(`tarea repetida: «${item.text.slice(0, 60)}»`);
			seen.add(item.id);
		}
	}
	return problems;
}

/** @param {string} priority */
function labelOf(priority) {
	return PRIORITY_LABELS[/** @type {keyof typeof PRIORITY_LABELS} */ (priority)] ?? priority;
}

/**
 * @param {readonly ParsedGroup[]} groups
 * @param {string} file
 */
function listDuplicateIds(groups, file) {
	const seen = new Map();
	/** @type {BoardProblem[]} */
	const problems = [];
	for (const group of groups) {
		const previous = seen.get(group.id);
		if (previous)
			problems.push({
				file,
				line: group.line,
				message: `«${group.title}» se llama casi igual que «${previous.title}»: cambia uno de los dos títulos`,
			});
		seen.set(group.id, group);
	}
	return problems;
}

/**
 * @param {BoardSources} sources
 * @param {Labels} labels
 */
function parseSources(sources, labels) {
	const tasks = parseFile(sources.tasks, { file: TASKS_FILE, blockLevel: 2, labels });
	const backlog = parseFile(sources.backlog, { file: BACKLOG_FILE, blockLevel: 3, fixedPhase: BACKLOG_PHASE, labels });
	return { tasks, backlog };
}

/**
 * Todo lo que impide generar un panel fiel a los dos `.md`. Vacío = el formato es correcto.
 * @param {BoardSources} sources
 * @param {Labels} labels
 */
export function listBoardProblems(sources, labels) {
	const { tasks, backlog } = parseSources(sources, labels);
	const needsPlatform = Object.keys(labels.platforms).length > 0;
	const problems = [
		...tasks.problems,
		...backlog.problems,
		...listGroupProblems(TASKS_FILE, tasks.groups, { needsRequires: true, needsPlatform }),
		...listGroupProblems(BACKLOG_FILE, backlog.groups, { needsRequires: false, needsPlatform }),
		...listDuplicateIds([...tasks.groups, ...backlog.groups], TASKS_FILE),
	];
	for (const phase of tasks.phases) {
		if (phase.id !== TEST_PHASE && !tasks.groups.some((group) => group.phase === phase.id))
			problems.push({ file: TASKS_FILE, line: phase.line, message: `la fase «${phase.label}» no tiene bloques: si se vació, se borra` });
	}
	const working = tasks.groups.filter((group) => group.working);
	if (working.length > 1)
		problems.push({
			file: TASKS_FILE,
			line: working[1]?.line ?? 1,
			message: `${working.length} bloques en curso (${working.map((group) => `«${group.title}»`).join(", ")}): solo uno a la vez`,
		});
	return problems;
}

/**
 * Los datos que pinta la página, en el orden de los `.md`, con las etiquetas del repo.
 * @param {BoardSources & { project: string, sourceHash: string, labels: Labels }} input
 */
export function buildBoardData(input) {
	const { tasks, backlog } = parseSources(input, input.labels);
	// «Por probar» no es trabajo pendiente: lo que solo espera la prueba del usuario no bloquea a nadie.
	const openTitles = new Set(
		[...tasks.groups, ...backlog.groups].filter((group) => group.phase !== TEST_PHASE).map((group) => group.title),
	);
	const groups = [...toBoardGroups(tasks.groups, openTitles), ...toBoardGroups(backlog.groups, openTitles)];
	/** @type {BoardPhase[]} */
	const phases = [
		{ id: TEST_PHASE, label: "Por probar" },
		...tasks.phases.filter((phase) => phase.id !== TEST_PHASE).map(({ id, label }) => ({ id, label })),
		{ id: BACKLOG_PHASE, label: "Backlog (diferido)" },
	];
	/** @type {BoardTrackStep[]} */
	const track = tasks.phases
		.filter((phase) => phase.inTrack)
		.map((phase) => ({
			label: phase.trackLabel,
			name: phase.trackName,
			status: groups.some((group) => group.phase === phase.id && group.working) ? "now" : "todo",
		}));
	return {
		project: input.project,
		sourceHash: input.sourceHash,
		platforms: Object.entries(input.labels.platforms),
		devices: Object.entries(input.labels.devices),
		priorities: Object.entries(PRIORITY_LABELS),
		phases,
		track,
		groups,
	};
}
