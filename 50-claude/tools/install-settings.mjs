#!/usr/bin/env node
// @ts-check
// Creates or completes ~/.claude/settings.json from 50-claude/settings.template.json.
//
// Claude Code only runs a hook registered in that file, and it is local (it holds the user's home
// and whatever Claude Code writes on each machine), so it is merged, never linked. One script for
// every system: install.ps1 here and install.sh in dotfiles-parrot both call it.
//
// Usage: node install-settings.mjs [--check] [--settings <file>] [--template <file>] [--home <dir>]
// --check reports and changes nothing; the exit code is 1 when something is missing.

import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const HOME_PLACEHOLDER = "REEMPLAZA_RUTA_HOME";
const BACKUP_SUFFIX = ".pre-dotfiles.bak";

/**
 * The template's text with this machine's home in place of the placeholder. Forward slashes, so
 * the JSON needs no escaping and the hook command works in any shell.
 *
 * @param {string} templateText
 * @param {string} home
 */
export function fillTemplate(templateText, home) {
	return templateText.replaceAll(HOME_PLACEHOLDER, home.replaceAll("\\", "/"));
}

/**
 * Adds to `settings` the template hooks it does not register, compared by event and file
 * ("Stop: x.mjs"): a hook registered for one event can be missing from another the template added
 * later. It goes into the group with the same matcher, or a new one. Returns what it added.
 *
 * @param {any} settings Changed in place.
 * @param {any} template
 * @returns {string[]}
 */
export function addMissingHooks(settings, template) {
	const added = [];
	settings.hooks ??= {};
	for (const [event, groups] of Object.entries(template.hooks ?? {})) {
		settings.hooks[event] ??= [];
		for (const group of groups) {
			for (const hook of group.hooks ?? []) {
				const file = /hooks\/([\w-]+\.mjs)/.exec(String(hook.command))?.[1];
				if (!file) continue;
				const registered = settings.hooks[event].some((/** @type {any} */ g) =>
					(g.hooks ?? []).some((/** @type {any} */ h) => String(h.command).includes(file)),
				);
				if (registered) continue;
				const target = settings.hooks[event].find((/** @type {any} */ g) => g.matcher === group.matcher);
				if (target) target.hooks = [...(target.hooks ?? []), hook];
				else {
					settings.hooks[event].push(
						group.matcher === undefined ? { hooks: [hook] } : { matcher: group.matcher, hooks: [hook] },
					);
				}
				added.push(`${event}: ${file}`);
			}
		}
	}
	return added;
}

/**
 * Adds to `settings` the template `deny` and `ask` rules it lacks. It never removes: each
 * machine's own rules stay, and a new safety rule in the template reaches every machine.
 *
 * @param {any} settings Changed in place.
 * @param {any} template
 * @returns {string[]}
 */
export function addMissingPermissions(settings, template) {
	const added = [];
	settings.permissions ??= {};
	for (const kind of ["deny", "ask"]) {
		const current = settings.permissions[kind] ?? [];
		const missing = (template.permissions?.[kind] ?? []).filter(
			(/** @type {string} */ rule) => !current.includes(rule),
		);
		if (missing.length === 0) continue;
		settings.permissions[kind] = [...current, ...missing];
		added.push(...missing.map((/** @type {string} */ rule) => `${kind}: ${rule}`));
	}
	return added;
}

/** A sortable local timestamp for the backup name, like 20261125121954. */
function timestamp() {
	const d = new Date();
	const pad = (/** @type {number} */ n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/**
 * Creates or completes the settings file. With `check`, only reports.
 *
 * @param {{ settingsPath: string, templatePath: string, home: string, check?: boolean }} options
 * @returns {{ ok: boolean, lines: string[] }} `ok` is false when `check` finds something missing.
 */
export function installSettings({ settingsPath, templatePath, home, check = false }) {
	const templateText = fillTemplate(readFileSync(templatePath, "utf8"), home);
	if (!existsSync(settingsPath)) {
		if (check) return { ok: false, lines: [`MISSING     ${settingsPath}`] };
		mkdirSync(path.dirname(settingsPath), { recursive: true });
		writeFileSync(settingsPath, templateText);
		return { ok: true, lines: [`Created from the template: ${settingsPath}`] };
	}

	const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
	const template = JSON.parse(templateText);
	const hooks = addMissingHooks(settings, template);
	const rules = addMissingPermissions(settings, template);

	if (check) {
		return {
			ok: hooks.length + rules.length === 0,
			lines: [
				hooks.length === 0
					? "ok          Claude Code hooks registered"
					: `MISSING     unregistered hooks: ${hooks.join(", ")}`,
				rules.length === 0
					? "ok          template deny/ask rules"
					: `MISSING     template rules: ${rules.join(", ")}`,
			],
		};
	}
	if (hooks.length + rules.length === 0) {
		return { ok: true, lines: ["Already has the template's hooks and rules - skip"] };
	}

	const backup = `${settingsPath}${BACKUP_SUFFIX}.${timestamp()}`;
	copyFileSync(settingsPath, backup);
	// UTF-8 without a BOM: Claude Code does not read the file if it starts with one.
	writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
	return {
		ok: true,
		lines: [
			...(hooks.length > 0 ? [`Hooks registered: ${hooks.join(", ")}`] : []),
			...(rules.length > 0 ? [`Rules added: ${rules.join(", ")}`] : []),
			`Backup of the previous file: ${backup}`,
		],
	};
}

// Runs only from the command line, not when the test imports it. Both sides are real paths: run
// through the ~/.claude/tools link, argv holds the link and import.meta.url the file it points to.
const invoked = process.argv[1] ? realpathSync(process.argv[1]) : "";
if (invoked === realpathSync(fileURLToPath(import.meta.url))) {
	const { values } = parseArgs({
		options: {
			check: { type: "boolean", default: false },
			settings: { type: "string", default: path.join(homedir(), ".claude", "settings.json") },
			template: {
				type: "string",
				default: fileURLToPath(new URL("../settings.template.json", import.meta.url)),
			},
			home: { type: "string", default: homedir() },
		},
	});
	const result = installSettings({
		settingsPath: values.settings,
		templatePath: values.template,
		home: values.home,
		check: values.check,
	});
	for (const line of result.lines) console.log(`  ${line}`);
	process.exitCode = result.ok ? 0 : 1;
}
