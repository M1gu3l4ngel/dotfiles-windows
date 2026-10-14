#!/usr/bin/env node
// @ts-check
// Hook global de Stop y PostToolUse: mantiene en espanol lo que Claude le escribe al usuario.
//
// `language: "Español"` en settings.json y la regla de CLAUDE.md son orientativos: en una tarea
// larga, con muchas herramientas de por medio, Claude a veces pasa al ingles a mitad del turno y
// sigue asi. Este hook mide el texto que ve el usuario y actua en dos momentos:
// - PostToolUse: tras cada herramienta mira lo ultimo que escribio Claude y, si esta en ingles,
//   le inyecta un aviso para que lo siguiente salga en espanol. No bloquea nada.
// - Stop: si el final del turno esta en ingles, el turno no termina y pide reescribirlo.
//
// Se juzga el FINAL del turno, no el turno entero: un turno que empezaba en espanol y pasaba al
// ingles sumaba bastante espanol para pasar el umbral (base-template, 2026-10-14).
//
// Se mide sin bloques de codigo, codigo inline, rutas ni URLs: un reporte en espanol cita
// comandos e identificadores en ingles y no debe contar en contra. La decision compara palabras
// funcionales (articulos, preposiciones, pronombres) de cada idioma, que no aparecen en
// identificadores. Del transcript se lee solo la cola: una sesion larga pasa de 400 MB.
//
// `stop_hook_active` evita el bucle: si el turno ya viene de un bloqueo de este hook, pasa.

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
// Palabras funcionales que se juzgan, contando desde el final del turno hacia atras: unas dos
// frases. Una ventana mas ancha vuelve a sumar el espanol de antes del cambio de idioma.
const WINDOW = 20;
const MIN_ENGLISH = { Stop: 12, PostToolUse: 8 };

/**
 * El texto que se lee como prosa: fuera bloques de codigo, codigo inline, URLs y rutas.
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
 * Cuantas palabras funcionales de cada idioma hay en el texto.
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
 * Si la entrada es un mensaje que escribio el usuario, no el resultado de una herramienta.
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
 * El final del transcript, sin la primera linea si quedo cortada por la mitad.
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
 * Los bloques de texto del asistente desde el ultimo mensaje del usuario, en orden.
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
 * Cuenta desde el ultimo bloque hacia atras hasta reunir WINDOW palabras funcionales.
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
					`~/.claude/hooks/reply-in-spanish.mjs: lo ultimo que escribiste esta en ingles (${en} ` +
					`palabras funcionales en ingles frente a ${es} en espanol). Escribe en espanol, con ` +
					"acentos, todo lo que digas al usuario desde aqui. Comandos, rutas e identificadores van tal cual.",
			},
		}),
	);
} else if (isEnglish) {
	process.stdout.write(
		JSON.stringify({
			decision: "block",
			reason:
				`Bloqueado por ~/.claude/hooks/reply-in-spanish.mjs: el final de tu respuesta esta en ingles ` +
				`(${en} palabras funcionales en ingles frente a ${es} en espanol). Reescribe en espanol, con ` +
				"acentos, lo que le reportas al usuario. Comandos, rutas e identificadores van tal cual.",
		}),
	);
}
process.exit(0);
