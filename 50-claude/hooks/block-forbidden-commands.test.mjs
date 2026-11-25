// Las reglas del hook global: que bloquee lo prohibido y deje pasar lo que Claude sí hace.
// Una regex de seguridad que deja de casar no avisa: se nota cuando ya se borró algo.

import assert from "node:assert/strict";
import { test } from "node:test";
import { findRule } from "./block-forbidden-commands.mjs";

/** @param {string} command */
const decide = (command) => findRule(command, process.cwd())?.decision ?? "allow";

test("crear una etiqueta firmada pasa, en cualquier carpeta", () => {
	assert.equal(decide('git tag -s v0.1.3 -m "0.1.3"'), "allow");
	assert.equal(decide("git -C ../brain-template tag --sign v1 -m v1"), "allow");
});

test("borrar o mover una etiqueta se bloquea", () => {
	assert.equal(decide("git tag -d v0.1.3"), "deny");
	assert.equal(decide("git tag --delete v0.1.3"), "deny");
	assert.equal(decide("git tag -s -f v0.1.3 -m x"), "deny");
});

test("una etiqueta sin firma se bloquea", () => {
	assert.equal(decide("git tag v0.1.3"), "deny");
	assert.equal(decide('git tag -a v0.1.3 -m "x"'), "deny");
	assert.equal(decide("git tag -s --no-sign v0.1.3 -m x"), "deny");
});

test("listar etiquetas pasa y no tapa una escritura detrás", () => {
	assert.equal(decide("git tag -l"), "allow");
	assert.equal(decide("git tag --list 'v*'"), "allow");
	assert.equal(decide("git -C ../brain-template tag -v v0.1.3"), "allow");
	assert.equal(decide("git tag -l; git reset --hard"), "deny");
	assert.equal(decide('git tag -s v1 -m "v1"; git reset --hard'), "deny");
});

test("lo que reescribe historia sigue bloqueado", () => {
	assert.equal(decide("git reset --hard HEAD~1"), "deny");
	assert.equal(decide("git rebase main"), "deny");
	assert.equal(decide("git commit --no-gpg-sign -m x"), "deny");
	assert.equal(decide("git add -A"), "deny");
	assert.equal(decide("git push --force origin staging"), "deny");
});

test("un comando dentro de comillas no es un comando", () => {
	assert.equal(decide('rg "git reset --hard" docs'), "allow");
});

test("el push de una etiqueta pregunta, como todo push", () => {
	assert.equal(decide("git push origin v0.1.3"), "ask");
});
