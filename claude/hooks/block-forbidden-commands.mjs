#!/usr/bin/env node
// @ts-check
// Hook PreToolUse (global) de Bash y PowerShell: corta los comandos que ~/.claude/CLAUDE.md prohibe.
//
// Lo que aqui se bloquea ya esta escrito en CLAUDE.md, pero como instruccion es orientativa:
// una sesion larga, un subagente o un modo automatico la olvidan. Un hook corre siempre,
// tambien dentro de un subagente.
//
// Va en un hook y no en `permissions.deny` porque un patron de permisos casa por prefijo: no ve
// un `git commit` detras de un `cd x &&`, ni dentro de PowerShell, ni un `/MIR` en mitad de un
// `robocopy`.
//
// Solo reglas universales. Lo propio de un proyecto (su gestor de paquetes, sus puertos) va en
// un hook de ese proyecto. `ask` no bloquea: le pasa la decision al usuario, para lo que la
// regla dice "pregunta siempre".
//
// Portable Windows/Linux. Solo la ruta de este archivo en settings.json cambia por maquina.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * @typedef {object} CommandRule
 * @property {RegExp} pattern Se prueba contra el comando con el contenido de las comillas tapado.
 * @property {(command: string, cwd: string) => boolean} [applies] Condicion extra, sobre el comando
 *   original y la carpeta de la sesion.
 * @property {"deny" | "ask"} decision
 * @property {string} reason
 */

// Repos cuya unica rama es main (sin staging ni CI que gaste minutos): subir a main es su flujo
// normal. Son de cada usuario, asi que la lista vive fuera del repo publico, en
// ~/.claude/hooks.local.json (`{ "mainOnlyRepos": ["owner/repo"] }`, ver
// claude/hooks.local.example.json). Se reconocen por la URL del remoto, no por la carpeta, que
// cambia de una maquina a otra. Sin el archivo, ningun repo tiene la excepcion.
const LOCAL_CONFIG = path.join(os.homedir(), ".claude", "hooks.local.json");

/** @returns {string[]} */
function readMainOnlyRepos() {
	try {
		const repos = JSON.parse(readFileSync(LOCAL_CONFIG, "utf8")).mainOnlyRepos;
		return Array.isArray(repos) ? repos.filter((repo) => typeof repo === "string") : [];
	} catch {
		return [];
	}
}

/**
 * La carpeta donde corre el git del comando: la de un `cd`, `Set-Location` o `git -C` delante,
 * o la de la sesion.
 *
 * @param {string} command
 * @param {string} cwd
 */
function resolveCommandDir(command, cwd) {
	const match = /(?:\bgit\s+-C\s+|\b(?:cd|Set-Location)\s+)("[^"]+"|'[^']+'|[^\s;&|]+)/i.exec(command);
	if (!match?.[1]) return cwd;
	return path.resolve(cwd, match[1].replaceAll(/^["']|["']$/g, ""));
}

/** @param {string} text */
function escapeRegExp(text) {
	return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/** @param {string} dir */
function isMainOnlyRepo(dir) {
	const repos = readMainOnlyRepos();
	if (repos.length === 0) return false;
	try {
		const url = execFileSync("git", ["-C", dir, "remote", "get-url", "origin"], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		})
			.trim()
			.toLowerCase();
		return repos.some((repo) => new RegExp(`[/:]${escapeRegExp(repo.toLowerCase())}(?:\\.git)?$`).test(url));
	} catch {
		return false;
	}
}

// Temporales y caches regenerables: borrarlos no pide confirmacion.
const TEMP_TARGET =
	/\$\{?(env:)?(TEMP|TMP|TMPDIR)\b|(^|[\s"'\\/])(tmp|temp)[\\/]|scratchpad|[\\/]dev[\\/]scratch[\\/]|node_modules|[\\/]\.next\b|[\\/]coverage\b/i;

// Un `git push`, también con opciones globales delante (`git -C ../otro push`): sin ellas en el
// patrón, ese comando se saltaba todas las reglas de subida.
const GIT_PUSH = String.raw`\bgit(?:\s+-[cC]\s+\S+)*\s+push\b`;

// `add` y `commit` no estan: los hace Claude al cerrar cada cambio verificado
// (~/.claude/CLAUDE.md, Interaccion). Lo que reescribe historia o arbol sigue siendo del usuario.
const GIT_WRITE =
	/\bgit\s+(?:-[cC]\s+\S+\s+)*(pull|reset|rebase|merge|checkout|switch|restore|clean|stash|cherry-pick|revert|tag|mv|rm|apply|am)\b/;

/** @type {readonly CommandRule[]} */
const RULES = [
	{
		pattern: /\bgit\b[^;&|]*(--no-gpg-sign|commit\.gpgsign=false)/,
		decision: "deny",
		reason: "commit sin firma: los commits van siempre firmados; si la clave caduco, pide al usuario que la desbloquee.",
	},
	{
		pattern: /\bgit\s+add\b[^;&|]*\s(-A|--all|\.)(?=\s|$|[;&|])/,
		decision: "deny",
		reason: "git add -A o `.`: se anaden por ruta solo los archivos del cambio.",
	},
	{
		pattern: new RegExp(String.raw`${GIT_PUSH}[^;&|]*(\s-f\b|--force|\s\+)`),
		decision: "deny",
		reason: "push forzado: nunca, en ningun repo.",
	},
	{
		pattern: new RegExp(String.raw`${GIT_PUSH}[^;&|]*\b(main|master)\b`),
		applies: (command, cwd) => !isMainOnlyRepo(resolveCommandDir(command, cwd)),
		decision: "deny",
		reason:
			"push a main: nunca; main lo promueve el usuario (salvo los repos de solo main de ~/.claude/hooks.local.json).",
	},
	{
		pattern: new RegExp(GIT_PUSH),
		decision: "ask",
		reason: "push: solo si el usuario eligio «Commit y push»; cada push gasta minutos de Actions.",
	},
	{
		pattern: GIT_WRITE,
		decision: "deny",
		reason:
			"git de escritura: lo que reescribe historia o arbol lo hace el usuario " +
			"(~/.claude/CLAUDE.md, Interaccion). Sugiere el comando; de lectura valen status, log, diff y show.",
	},
	{
		pattern: /\brobocopy\b/i,
		applies: (command) => /\/MIR\b/i.test(command) && !/\/XJ\b/i.test(command),
		decision: "deny",
		reason: "robocopy /MIR sin /XJ atraviesa las junctions y vacia la carpeta real del otro lado. Anade /XJ.",
	},
	{
		pattern: /\bprettier\b[^;&|]*--write\b/,
		applies: (command) => /--write[^;&|]*(\*|\$\(|`)|xargs[^;&|]*prettier/.test(command),
		decision: "deny",
		reason:
			"prettier --write con un glob o una lista calculada reformatea archivos ajenos al cambio. " +
			"Escribe en el comando las rutas de los archivos editados (~/.claude/CLAUDE.md, Formato).",
	},
	{
		pattern: /\brm\s+-[a-zA-Z]*[rR]|\bRemove-Item\b[^;&|]*-Recurse|\brmdir\s+\/s\b|\brd\s+\/s\b/i,
		applies: (command) => !TEMP_TARGET.test(command),
		decision: "ask",
		reason:
			"borrado recursivo fuera de un temporal: el trabajo se confirma siempre antes de borrar, y " +
			"`Remove-Item -Force` no usa papelera y atraviesa junctions (~/.claude/CLAUDE.md, Confirmar antes de borrar).",
	},
];

/**
 * Tapa el contenido de las comillas con `_`, conservando la longitud: un `git commit` dentro de
 * un patron de busqueda o de un mensaje no es un comando.
 *
 * @param {string} command
 */
function unquoted(command) {
	return command.replaceAll(/'[^']*'|"(?:[^"\\]|\\.)*"/g, (m) => `${m[0]}${"_".repeat(m.length - 2)}${m.at(-1)}`);
}

/**
 * @param {string} command
 * @param {string} cwd
 */
function findRule(command, cwd) {
	const masked = unquoted(command);
	return RULES.find((rule) => rule.pattern.test(masked) && (rule.applies?.(command, cwd) ?? true));
}

let input = "";
for await (const chunk of process.stdin) input += chunk;

let command = "";
let cwd = process.cwd();
try {
	const parsed = JSON.parse(input);
	command = String(parsed.tool_input?.command ?? "");
	if (typeof parsed.cwd === "string") cwd = parsed.cwd;
} catch {
	process.exit(0);
}

const rule = findRule(command, cwd);
if (rule) {
	process.stdout.write(
		JSON.stringify({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: rule.decision,
				permissionDecisionReason: `~/.claude/hooks/block-forbidden-commands.mjs: ${rule.reason}`,
			},
		}),
	);
}
process.exit(0);
