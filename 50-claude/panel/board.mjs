// @ts-check
// Reads `docs/tasks.md` and `docs/backlog.md` and turns them into the panel's data.
//
// The panel is never written by hand: it is a view of these two files. Copied by hand, the text
// got summarized, lost detail and drifted without anything noticing. Here each task's text passes
// as is, and whatever the parser cannot read comes out as a format problem (`listBoardProblems`):
// nothing is lost silently.
//
// Each repo defines its platforms and devices in `.claude/panel.json`; the priorities and the
// named phases are the same everywhere. The format is described in this folder's README. The
// headings and field names it reads are Spanish, like `docs/tasks.md`.

import { createHash } from "node:crypto";
import { BACKLOG_FILE, TASKS_FILE } from "./panel-files.mjs";

/** Priorities in working order: P0 security or data loss, P1 wrong behavior, P2 breaks a rule, Mejora (improvement). */
export const PRIORITY_LABELS = /** @type {const} */ ({ p0: "P0", p1: "P1", p2: "P2", improvement: "Mejora" });
const PRIORITY_ORDER = Object.keys(PRIORITY_LABELS);

/** Phases other than `Fase N`: their heading in the `.md`, their panel id and whether they show in the track. */
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
 * @property {string} id Fingerprint of the text without the device tag: a checkmark survives other items moving.
 * @property {string} text
 * @property {string[]} devices Empty: tested on any device.
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
 * @property {string[]} blockedBy The blocks in its «Requiere» that are still open.
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
 * A readable, stable id from a title: no accents, no punctuation, lowercase.
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
 * Names separated by commas or «y» → their ids; anything unrecognized goes to `unknown`.
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
 * `Instalación y Shell.` → their ids; anything unrecognized goes to `unknown`.
 * @param {string} value
 * @param {Record<string, string>} labels
 */
export function parsePlatforms(value, labels) {
	const { ids, unknown } = parseLabelList(value, labels);
	return { platforms: ids, unknown };
}

/**
 * `[Esta PC] El prompt…` → its devices and the text without the tag. Without a tag, or without
 * configured devices, the text stays as is.
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
 * `P1.` or `Mejora` → its id; `null` if it is neither.
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
		// The name goes into the id: there can be two «Bloqueado por terceros», and the panel groups by id.
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
 * Joins a block's prose lines into paragraphs, as the `.md` renders them: each bullet is its own.
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
 * Walks a `.md` and returns its phases and blocks, with whatever it could not read.
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
	// The first `#` is the file title: what hangs from it (how to read the file) is not a phase.
	let seenTitle = false;
	/** @type {BoardItem | null} */
	let lastItem = null;
	// The value of `**Requiere:**` can continue on the next lines, up to the blank line.
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
				report(lineNumber, `extra level-1 heading: «${line}»`);
				return;
			}
			phase = parsePhaseHeading(line.slice(2), lineNumber);
			phaseNote = [];
			if (phase) phases.push(phase);
			else
				report(
					lineNumber,
					`unknown phase «${line.slice(2)}»: use «Fase N — nombre», «Por probar», «Cierre», «Lo hace el dueño», «Aplazado» or «Bloqueado por terceros»`,
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
			if (phaseId) report(lineNumber, `unexpected heading level: «${line}»`);
			return;
		}
		if (!phaseId || line === "---") return;

		if (CHECKED_ITEM_RE.test(line)) {
			report(lineNumber, "task checked as done: finished work is deleted, not checked");
			return;
		}

		const item = OPEN_ITEM_RE.exec(line);
		if (item) {
			readingRequires = false;
			// Loose tasks under the phase (Aplazado, Bloqueado): the phase acts as their block.
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
					report(lineNumber, `unknown device «${label}»: use ${Object.values(deviceLabels).join(", ")}`);
			} else {
				// Outside «Por probar», leading brackets are part of the task text; only a real device
				// tag is reported.
				if (tagged.devices.length > 0) report(lineNumber, "a device only goes in «Por probar» checkboxes");
				tagged = { devices: [], text, unknown: [] };
			}
			/** @type {BoardItem} */
			const created = { id: computeItemId(tagged.text), text: tagged.text, devices: tagged.devices };
			lastItem = created;
			target.items.push(created);
			return;
		}
		// A long task continued on the next lines.
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
					report(lineNumber, `unknown platform «${label}»: use ${Object.values(platformLabels).join(", ")}`);
			} else if (name === "Prioridad") {
				current.priority = parsePriority(value);
				if (!current.priority)
					report(lineNumber, `unknown priority «${value}»: use ${Object.values(PRIORITY_LABELS).join(", ")}`);
			} else if (name === "Requiere") {
				current.requires = value.trim();
				current.hasRequires = true;
				readingRequires = true;
			} else if (value.replace(/\.$/, "").trim().toLowerCase() === WORKING_STATE) {
				current.working = true;
			} else {
				report(lineNumber, `unknown state «${value}»: the only one is «${WORKING_STATE}»`);
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
 * The «quoted» titles in a «Requiere» that are still an open block. A closed block is deleted
 * from the `.md`, so whatever is no longer a block no longer blocks.
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
 * What the format requires and the parser cannot fix on its own.
 * @param {string} file
 * @param {readonly ParsedGroup[]} groups
 * @param {{ needsRequires: boolean, needsPlatform: boolean }} rules
 */
function listGroupProblems(file, groups, rules) {
	/** @type {BoardProblem[]} */
	const problems = [];
	// The previous block of the same phase: within a phase, blocks go from P0 to Mejora.
	/** @type {ParsedGroup | null} */
	let previous = null;
	for (const group of groups) {
		/** @param {string} message */
		const report = (message) => problems.push({ file, line: group.line, message: `«${group.title}»: ${message}` });
		if (group.items.length === 0) report("block without tasks: once empty, delete it");
		if (rules.needsPlatform && !group.hasPlatform) report("missing **Plataforma:** line");
		if (group.phase === TEST_PHASE) {
			if (group.working) report("what waits to be tested is never marked «en curso»");
			continue;
		}
		if (rules.needsRequires && !group.hasRequires) report("missing **Requiere:** line");
		if (isNumberedPhase(group.phase)) {
			const prev = /** @type {ParsedGroup | null} */ (previous);
			if (!group.priority) report("missing **Prioridad:** line");
			else if (
				prev?.phase === group.phase &&
				prev.priority &&
				PRIORITY_ORDER.indexOf(group.priority) < PRIORITY_ORDER.indexOf(prev.priority)
			)
				report(
					`${labelOf(group.priority)} comes after «${prev.title}» (${labelOf(prev.priority)}): within a phase, from P0 to Mejora`,
				);
			previous = group;
		} else if (group.priority) {
			report("a priority only goes in the blocks of a numbered phase");
		}
		const seen = new Set();
		for (const item of group.items) {
			if (seen.has(item.id)) report(`repeated task: «${item.text.slice(0, 60)}»`);
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
				message: `«${group.title}» is named almost like «${previous.title}»: rename one of the two`,
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
 * Everything that prevents generating a panel faithful to the two `.md` files. Empty: the format is right.
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
			problems.push({ file: TASKS_FILE, line: phase.line, message: `phase «${phase.label}» has no blocks: once empty, delete it` });
	}
	const working = tasks.groups.filter((group) => group.working);
	if (working.length > 1)
		problems.push({
			file: TASKS_FILE,
			line: working[1]?.line ?? 1,
			message: `${working.length} blocks «en curso» (${working.map((group) => `«${group.title}»`).join(", ")}): only one at a time`,
		});
	return problems;
}

/**
 * The data the page renders, in the order of the `.md` files, with the repo's labels.
 * @param {BoardSources & { project: string, sourceHash: string, labels: Labels }} input
 */
export function buildBoardData(input) {
	const { tasks, backlog } = parseSources(input, input.labels);
	// «Por probar» is not pending work: what only waits for the user's test blocks nobody.
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
