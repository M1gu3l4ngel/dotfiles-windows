// Tests for the settings merge: it creates the file, adds only what is missing, keeps the
// machine's own entries, backs up before writing and never writes in --check mode.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { addMissingHooks, addMissingPermissions, installSettings } from "./install-settings.mjs";

const dir = mkdtempSync(path.join(tmpdir(), "install-settings-"));
after(() => rmSync(dir, { recursive: true, force: true }));

const template = {
	permissions: { deny: ["Read(**/.ssh/**)", "Read(**/.gnupg/**)"], ask: ["Read(**/.env)"] },
	hooks: {
		PreToolUse: [
			{
				matcher: "Bash|PowerShell",
				hooks: [{ type: "command", command: 'node "REEMPLAZA_RUTA_HOME/.claude/hooks/a.mjs"' }],
			},
		],
		Stop: [{ hooks: [{ type: "command", command: 'node "REEMPLAZA_RUTA_HOME/.claude/hooks/b.mjs"' }] }],
	},
};
const templatePath = path.join(dir, "template.json");
writeFileSync(templatePath, JSON.stringify(template));

test("a missing file is created with the real home, and --check only reports it", () => {
	const settingsPath = path.join(dir, "new", "settings.json");
	const checked = installSettings({ settingsPath, templatePath, home: "C:\\Users\\x", check: true });
	assert.equal(checked.ok, false);
	assert.throws(() => readFileSync(settingsPath));

	installSettings({ settingsPath, templatePath, home: "C:\\Users\\x" });
	const created = readFileSync(settingsPath, "utf8");
	assert.match(created, /C:\/Users\/x\/\.claude\/hooks\/a\.mjs/);
	assert.doesNotMatch(created, /REEMPLAZA_RUTA_HOME/);
});

test("hooks are added by event and file, into the group with the same matcher", () => {
	const settings = {
		hooks: { PreToolUse: [{ matcher: "Bash|PowerShell", hooks: [{ command: "node mine.mjs" }] }] },
	};
	const added = addMissingHooks(settings, template);
	assert.deepEqual(added, ["PreToolUse: a.mjs", "Stop: b.mjs"]);
	assert.equal(settings.hooks.PreToolUse.length, 1);
	assert.equal(settings.hooks.PreToolUse[0].hooks.length, 2);
	assert.deepEqual(addMissingHooks(settings, template), []);
});

test("rules are added, never removed", () => {
	const settings = { permissions: { deny: ["Edit(//c/Windows/**)", "Read(**/.ssh/**)"] } };
	const added = addMissingPermissions(settings, template);
	assert.deepEqual(added, ["deny: Read(**/.gnupg/**)", "ask: Read(**/.env)"]);
	assert.deepEqual(settings.permissions.deny, [
		"Edit(//c/Windows/**)",
		"Read(**/.ssh/**)",
		"Read(**/.gnupg/**)",
	]);
});

test("runs from the command line also through a link, as ~/.claude/tools is", () => {
	const linkDir = path.join(dir, "linked-tools");
	symlinkSync(path.dirname(fileURLToPath(import.meta.url)), linkDir, "junction");
	const settingsPath = path.join(dir, "cli", "settings.json");
	const run = () =>
		execFileSync(process.execPath, [
			path.join(linkDir, "install-settings.mjs"),
			"--check",
			"--settings",
			settingsPath,
			"--template",
			templatePath,
		]);
	assert.throws(run, (/** @type {any} */ error) => error.status === 1 && /MISSING/.test(String(error.stdout)));
});

test("an existing file is completed with a backup, and a second run changes nothing", () => {
	const folder = mkdtempSync(path.join(dir, "existing-"));
	const settingsPath = path.join(folder, "settings.json");
	writeFileSync(settingsPath, JSON.stringify({ model: "mine", permissions: { deny: [] } }));

	assert.equal(installSettings({ settingsPath, templatePath, home: "/home/x", check: true }).ok, false);
	installSettings({ settingsPath, templatePath, home: "/home/x" });
	const merged = JSON.parse(readFileSync(settingsPath, "utf8"));
	assert.equal(merged.model, "mine");
	assert.equal(merged.permissions.deny.length, 2);
	assert.equal(readdirSync(folder).filter((f) => f.includes(".pre-dotfiles.bak.")).length, 1);

	const again = installSettings({ settingsPath, templatePath, home: "/home/x" });
	assert.match(again.lines[0], /skip/);
	assert.equal(installSettings({ settingsPath, templatePath, home: "/home/x", check: true }).ok, true);
});
