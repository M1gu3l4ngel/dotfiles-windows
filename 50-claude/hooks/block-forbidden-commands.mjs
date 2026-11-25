#!/usr/bin/env node
// @ts-check
// Hook PreToolUse (global) de Bash y PowerShell: corta los comandos que ~/.claude/CLAUDE.md prohíbe.
//
// Lo que aquí se bloquea ya está escrito en CLAUDE.md, pero como instrucción es orientativa: una
// sesión larga, un subagente o un modo automático la olvidan. Un hook corre siempre, también
// dentro de un subagente. Las reglas viven en `command-rules.mjs`, la fuente única que copia cada
// proyecto; aquí solo va lo propio del hook global: en qué repos se protege `main`.
//
// Portable Windows/Linux. Solo la ruta de este archivo en settings.json cambia por máquina.

import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCommandRules, findCommandRule, runCommandHook } from "./command-rules.mjs";

// Repos cuya única rama es main (sin staging ni CI que gaste minutos): subir a main es su flujo
// normal. Son de cada usuario, así que la lista vive fuera del repo público, en
// ~/.claude/hooks.local.json (`{ "mainOnlyRepos": ["owner/repo"] }`, ver
// 50-claude/hooks.local.example.json). Se reconocen por la URL del remoto, no por la carpeta, que
// cambia de una máquina a otra. Sin el archivo, ningún repo tiene la excepción.
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
		return repos.some((repo) =>
			new RegExp(`[/:]${escapeRegExp(repo.toLowerCase())}(?:\\.git)?$`).test(url),
		);
	} catch {
		return false;
	}
}

const RULES = buildCommandRules({ isMainProtected: (dir) => !isMainOnlyRepo(dir) });

/**
 * @param {string} command
 * @param {string} cwd
 */
export function findRule(command, cwd) {
	return findCommandRule(RULES, command, cwd);
}

// Solo lee stdin como hook, no al importarlo los tests; ruta real porque `~/.claude/hooks` enlaza aquí.
const invokedPath = process.argv[1] ? realpathSync(process.argv[1]) : "";
if (invokedPath === realpathSync(fileURLToPath(import.meta.url))) {
	await runCommandHook(RULES, "~/.claude/hooks/block-forbidden-commands.mjs");
}
