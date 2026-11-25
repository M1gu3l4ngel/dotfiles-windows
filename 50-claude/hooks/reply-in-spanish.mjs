#!/usr/bin/env node
// @ts-check
// Global Stop and PostToolUse hook: keeps what Claude writes to the user in Spanish.
//
// `language: "Español"` in settings.json and the CLAUDE.md rule are only guidance: in a long task
// with many tool calls, Claude sometimes switches to English mid-turn and stays there. This hook
// measures the text the user sees and acts at two points:
// - PostToolUse: after each tool it looks at what Claude wrote last and, if it is English, injects
//   a reminder so that what follows is Spanish. It blocks nothing.
// - Stop: if the end of the turn is English, the turn does not end and must be rewritten.
//
// It judges the END of the turn, not the whole turn: a turn that started in Spanish and switched
// to English used to add up enough Spanish to pass the threshold.
//
// It measures without code blocks, inline code, paths or URLs: a Spanish report quotes English
// commands and identifiers, and they must not count against it. The decision compares each
// language's function words (articles, prepositions, pronouns), which identifiers do not contain.
// Only the tail of the transcript is read: a long session goes past 400 MB.
//
// `stop_hook_active` prevents a loop: if the turn already comes from this hook's block, it passes.

import { closeSync, fstatSync, openSync, readSync } from "node:fs";

const ENGLISH = new Set(
	("the and of to is are was were be been this that these those with for from into on in it its " +
		"you your we our they their there here what which who when where why how not but or if then " +
		"than so can will would should could have has had do does did done just also now all any " +
		"each both only after before about because while still already yet let i'm it's don't " +
		"i'll we'll you'll there's that's isn't doesn't won't can't")
		.split(" "),
);
const SPANISH = new Set(
	("el la los las un una unos unas de del al y o que en es son fue ser está están estaba con " +
		"por para sin sobre entre como pero si ya no lo le les se su sus mi tu este esta estos estas " +
		"ese esa eso aquí ahí también cuando donde porque mientras todavía hay muy más menos cada " +
		"todo todos nada algo qué cómo cuál dónde quedó queda hace hizo puedes tienes")
		.split(" "),
);

const TAIL_BYTES = 1024 * 1024;
// Function words judged, counting back from the end of the turn: about two sentences. A wider
// window adds back the Spanish from before the language switch.
const WINDOW = 20;
const MIN_ENGLISH = { Stop: 12, PostToolUse: 8 };

/**
 * The text that reads as prose: without code blocks, inline code, URLs and paths.
 *
 * @param {string} text
 */
function prose(text) {
	return text
		.replaceAll(/```[\s\S]*?```/g, " ")
		.replaceAll(/`[^`\n]*`/g, " ")
		.replaceAll(/https?:\/\/\S+/g, " ")
		.replaceAll(/\S*[\\/]\S*/g, " ");
}

/**
 * How many function words of each language the text has.
 *
 * @param {string} text
 */
function count(text) {
	let en = 0;
	let es = 0;
	for (const word of prose(text).toLowerCase().match(/[\p{L}']+/gu) ?? []) {
		if (ENGLISH.has(word)) en++;
		if (SPANISH.has(word)) es++;
	}
	return { en, es };
}

/**
 * Whether the entry is a message the user wrote, not a tool result.
 *
 * @param {any} entry
 */
function isUserPrompt(entry) {
	if (entry.type !== "user" || entry.isMeta) return false;
	const content = entry.message?.content;
	if (typeof content === "string") return true;
	return Array.isArray(content) && content.some((block) => block.type === "text");
}

/**
 * The end of the transcript, without its first line if that line was cut in half.
 *
 * @param {string} path
 */
function readTail(path) {
	const fd = openSync(path, "r");
	try {
		const size = fstatSync(fd).size;
		const length = Math.min(size, TAIL_BYTES);
		const buffer = Buffer.alloc(length);
		readSync(fd, buffer, 0, length, size - length);
		const text = buffer.toString("utf8");
		return length < size ? text.slice(text.indexOf("\n") + 1) : text;
	} finally {
		closeSync(fd);
	}
}

/**
 * The assistant's text blocks since the user's last message, in order.
 *
 * @param {string} transcriptPath
 */
function turnBlocks(transcriptPath) {
	const lines = readTail(transcriptPath).split("\n");
	/** @type {string[]} */
	const blocks = [];
	for (let i = lines.length - 1; i >= 0; i--) {
		if (!lines[i].trim()) continue;
		let entry;
		try {
			entry = JSON.parse(lines[i]);
		} catch {
			continue;
		}
		if (isUserPrompt(entry)) break;
		if (entry.type !== "assistant" || entry.isSidechain) continue;
		const texts = (entry.message?.content ?? []).filter((block) => block.type === "text");
		blocks.unshift(...texts.map((block) => block.text));
	}
	return blocks;
}

/**
 * Counts back from the last block until it has WINDOW function words.
 *
 * @param {string[]} blocks
 */
function countTail(blocks) {
	let en = 0;
	let es = 0;
	for (let i = blocks.length - 1; i >= 0 && en + es < WINDOW; i--) {
		const block = count(blocks[i]);
		en += block.en;
		es += block.es;
	}
	return { en, es };
}

let input = "";
for await (const chunk of process.stdin) input += chunk;

let event = "";
/** @type {string[]} */
let blocks = [];
try {
	const data = JSON.parse(input);
	event = data.hook_event_name ?? "Stop";
	if (event === "Stop" && data.stop_hook_active) process.exit(0);
	blocks = data.transcript_path ? turnBlocks(data.transcript_path) : [];
	const last = data.last_assistant_message;
	if (typeof last === "string" && last && blocks.at(-1) !== last) blocks.push(last);
} catch {
	process.exit(0);
}

const { en, es } = countTail(blocks);
const isEnglish = en >= (MIN_ENGLISH[event] ?? MIN_ENGLISH.Stop) && en > es * 2;
if (isEnglish && event === "PostToolUse") {
	process.stdout.write(
		JSON.stringify({
			hookSpecificOutput: {
				hookEventName: "PostToolUse",
				additionalContext:
					`~/.claude/hooks/reply-in-spanish.mjs: what you wrote last is in English (${en} ` +
					`English function words against ${es} Spanish ones). From here on, write everything ` +
					"you tell the user in Spanish, with accents. Commands, paths and identifiers stay as they are.",
			},
		}),
	);
} else if (isEnglish) {
	process.stdout.write(
		JSON.stringify({
			decision: "block",
			reason:
				`Blocked by ~/.claude/hooks/reply-in-spanish.mjs: the end of your reply is in English ` +
				`(${en} English function words against ${es} Spanish ones). Rewrite what you report to ` +
				"the user in Spanish, with accents. Commands, paths and identifiers stay as they are.",
		}),
	);
}
process.exit(0);
