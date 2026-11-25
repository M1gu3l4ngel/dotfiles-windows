// Tests for the global hook's rules: it blocks what is forbidden and lets through what Claude does.
// A safety regex that stops matching gives no warning: it shows only after something is deleted.

import assert from "node:assert/strict";
import { test } from "node:test";
import { findRule } from "./block-forbidden-commands.mjs";

/** @param {string} command */
const decide = (command) => findRule(command, process.cwd())?.decision ?? "allow";

test("creating a signed tag passes, in any folder", () => {
	assert.equal(decide('git tag -s v0.1.3 -m "0.1.3"'), "allow");
	assert.equal(decide("git -C ../other-repo tag --sign v1 -m v1"), "allow");
});

test("deleting or moving a tag is blocked", () => {
	assert.equal(decide("git tag -d v0.1.3"), "deny");
	assert.equal(decide("git tag --delete v0.1.3"), "deny");
	assert.equal(decide("git tag -s -f v0.1.3 -m x"), "deny");
});

test("an unsigned tag is blocked", () => {
	assert.equal(decide("git tag v0.1.3"), "deny");
	assert.equal(decide('git tag -a v0.1.3 -m "x"'), "deny");
	assert.equal(decide("git tag -s --no-sign v0.1.3 -m x"), "deny");
});

test("listing tags passes and does not hide a write after it", () => {
	assert.equal(decide("git tag -l"), "allow");
	assert.equal(decide("git tag --list 'v*'"), "allow");
	assert.equal(decide("git -C ../other-repo tag -v v0.1.3"), "allow");
	assert.equal(decide("git tag -l; git reset --hard"), "deny");
	assert.equal(decide('git tag -s v1 -m "v1"; git reset --hard'), "deny");
});

test("rewriting history stays blocked", () => {
	assert.equal(decide("git reset --hard HEAD~1"), "deny");
	assert.equal(decide("git rebase main"), "deny");
	assert.equal(decide("git commit --no-gpg-sign -m x"), "deny");
	assert.equal(decide("git add -A"), "deny");
	assert.equal(decide("git push --force origin staging"), "deny");
});

test("a command inside quotes is not a command", () => {
	assert.equal(decide('rg "git reset --hard" docs'), "allow");
});

test("pushing a tag asks, like any push", () => {
	assert.equal(decide("git push origin v0.1.3"), "ask");
});
