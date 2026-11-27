// Tests for the follow-ci hook: which commands pushed a branch and from where, and when a commit's
// CI lets the turn end.

import assert from "node:assert/strict";
import { test } from "node:test";
import { decideCiState, listPushDirs, toNativePath } from "./follow-ci.mjs";

test("a Git Bash path is read as a Windows path", () => {
	assert.equal(toNativePath("/d/Dev/projects/core"), "D:/Dev/projects/core");
	assert.equal(toNativePath("C:/Users/x"), "C:/Users/x");
});

test("a push is attributed to the folder of the last cd before it", () => {
	assert.deepEqual(listPushDirs("cd /d/Dev/brain && git commit -m x && git push -q origin main", "C:/x"), [
		"D:/Dev/brain",
	]);
	assert.deepEqual(listPushDirs("git push origin staging", "D:/Dev/core"), ["D:/Dev/core"]);
	assert.deepEqual(listPushDirs('git -C "D:/Dev/core" push origin staging', "C:/x"), ["D:/Dev/core"]);
});

test("a push of tags only, or a dry run, starts no branch CI", () => {
	assert.deepEqual(listPushDirs("git push -q origin v0.3.2", "D:/x"), []);
	assert.deepEqual(listPushDirs("git push --tags", "D:/x"), []);
	assert.deepEqual(listPushDirs("git push --dry-run origin main", "D:/x"), []);
});

test("both pushes of a release count once, by their branch", () => {
	assert.deepEqual(
		listPushDirs("cd /d/Dev/t && git push -q origin main && git push -q origin v0.3.2", "C:/x"),
		["D:/Dev/t"],
	);
});

test("the turn waits while a run is queued or running, and right after the push", () => {
	assert.equal(decideCiState([], 10_000), "running");
	assert.equal(
		decideCiState([{ status: "in_progress", conclusion: null, name: "CI" }], 60_000),
		"running",
	);
});

test("a red run blocks, a green or skipped one lets the turn end", () => {
	const run = (conclusion) => ({ status: "completed", conclusion, name: "CI" });
	assert.equal(decideCiState([run("success"), run("failure")], 0), "failed");
	assert.equal(decideCiState([run("success"), run("skipped")], 0), "green");
});

test("a commit with no run after the grace period has no CI to follow", () => {
	assert.equal(decideCiState([], 10 * 60 * 1000), "none");
});
